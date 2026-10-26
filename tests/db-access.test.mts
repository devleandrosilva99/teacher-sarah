// Garante que toda consulta do app passa por withScope/transaction
// (server/db/client.ts), que assume o papel app_user só na transação. Uma
// consulta feita direto no pool rodaria como neondb_owner, que tem BYPASSRLS:
// a RLS seria ignorada sem ninguém perceber. Roda sem banco.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP_DIRS = ["app", "components", "lib", "server"];
const CLIENT = path.join("server", "db", "client.ts");
const CONTEXT = path.join("server", "db", "context-sql.ts");

function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(rel));
    else if (/\.(ts|tsx|mts|mjs|js)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const sources = APP_DIRS.flatMap(files).filter((f) => f !== CLIENT && f !== CONTEXT);

const FORBIDDEN: [RegExp, string][] = [
  [/from\s+["']pg["']|require\(\s*["']pg["']\s*\)|import\(\s*["']pg["']\s*\)/, "importa o pg diretamente"],
  [/@neondatabase\/serverless|["']postgres["']/, "importa outro driver de banco"],
  [/\bnew\s+(pg\.)?(Pool|Client)\s*\(/, "cria conexão própria"],
  [/\b(SET|RESET)\s+(LOCAL\s+)?ROLE\b/i, "troca o papel do banco"],
  [/set_config\(\s*['"`]role/i, "troca o papel do banco"],
  [/process\.env\.DATABASE_URL/, "lê a URL do banco"],
];

test("nenhum código do app acessa o banco fora de server/db/client.ts", () => {
  const problems: string[] = [];
  for (const f of sources) {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const [re, why] of FORBIDDEN) if (re.test(text)) problems.push(`${f}: ${why}`);
  }
  assert.deepEqual(problems, [], `Use withScope() em vez disso:\n${problems.join("\n")}`);
});

test("client.ts não exporta o pool nem conexões sem o papel app_user", () => {
  const text = fs.readFileSync(path.join(ROOT, CLIENT), "utf8");
  const exported = [...text.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class|type|interface)\s+(\w+)/gm)].map((m) => m[1]);
  assert.deepEqual(exported.sort(), ["Db", "Scope", "closeDb", "configureDb", "transaction"].sort());
  // A única abertura de conexão é a de transaction(); o comando de início é
  // montado (e validado) antes de conectar e é a primeira coisa enviada.
  assert.equal((text.match(/\.connect\(\)/g) ?? []).length, 1);
  assert.match(text, /const begin = beginStatement\(scope, [^)]*\);[^\n]*\n[^\n]*\.connect\(\)\);\s*try \{\s*await client\.query\(begin\);/);
  assert.equal((text.match(/client\.query\(/g) ?? []).length, 5, "só begin, COMMIT, ROLLBACK e as duas de wrap()");
});

test("o início da transação assume app_user e define o contexto só na transação", async () => {
  const { beginStatement, APP_ROLE } = await import("../server/db/context-sql.ts");
  const id = "11111111-2222-4333-8444-555555555555";
  const sql = beginStatement({ teacherId: id, studentId: id }, "public");
  assert.ok(sql.startsWith("BEGIN; SELECT "));
  assert.ok(sql.includes(`set_config('role', '${APP_ROLE}', true)`));
  for (const name of ["app\\.teacher_id", "app\\.student_id", "app\\.system", "search_path"])
    assert.match(sql, new RegExp(`set_config\\('${name}', '[^']*', true\\)`));
  assert.equal((sql.match(/, true\)/g) ?? []).length, 5, "todo set_config é local à transação");
  assert.ok(beginStatement(null).includes("set_config('app.teacher_id', '', true)"));
  assert.ok(beginStatement({ system: true }).includes("set_config('app.system', 'on', true)"));
});

test("valores maliciosos no contexto são recusados antes de chegar ao banco", async () => {
  const { beginStatement, contextLiteral } = await import("../server/db/context-sql.ts");
  const ok = "11111111-2222-4333-8444-555555555555";
  const evil = [
    `${ok}'; RESET ROLE; --`,
    "' OR 1=1 --",
    "11111111-2222-4333-8444-55555555555'",
    `${ok}\n`,
  ];
  for (const v of evil) {
    assert.throws(() => beginStatement(v), /Valor inválido/);
    assert.throws(() => beginStatement({ teacherId: ok, studentId: v }), /Valor inválido/);
  }
  assert.throws(() => beginStatement(null, "public; DROP TABLE users"), /Valor inválido/);
  assert.throws(() => contextLiteral("yes", "flag"), /Valor inválido/);
  assert.throws(() => contextLiteral("App_User", "ident"), /Valor inválido/);
});
