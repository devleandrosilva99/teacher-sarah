// Garante que toda consulta do app passa por withScope/transaction
// (server/db/client.ts), que faz SET LOCAL ROLE app_user. Uma consulta feita
// direto no pool rodaria como neondb_owner, que tem BYPASSRLS: a RLS seria
// ignorada sem ninguém perceber. Roda sem banco.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP_DIRS = ["app", "components", "lib", "server"];
const CLIENT = path.join("server", "db", "client.ts");

function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(rel));
    else if (/\.(ts|tsx|mts|mjs|js)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const sources = APP_DIRS.flatMap(files).filter((f) => f !== CLIENT);

const FORBIDDEN: [RegExp, string][] = [
  [/from\s+["']pg["']|require\(\s*["']pg["']\s*\)|import\(\s*["']pg["']\s*\)/, "importa o pg diretamente"],
  [/@neondatabase\/serverless|["']postgres["']/, "importa outro driver de banco"],
  [/\bnew\s+(pg\.)?(Pool|Client)\s*\(/, "cria conexão própria"],
  [/\b(SET|RESET)\s+(LOCAL\s+)?ROLE\b/i, "troca o papel do banco"],
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

test("client.ts não exporta o pool nem conexões sem o SET ROLE", () => {
  const text = fs.readFileSync(path.join(ROOT, CLIENT), "utf8");
  const exported = [...text.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class|type|interface)\s+(\w+)/gm)].map((m) => m[1]);
  assert.deepEqual(exported.sort(), ["APP_ROLE", "Db", "Scope", "closeDb", "configureDb", "transaction"].sort());
  // A única abertura de conexão é a de transaction(), seguida do contexto com SET LOCAL ROLE.
  assert.equal((text.match(/\.connect\(\)/g) ?? []).length, 1);
  assert.match(text, /SET LOCAL ROLE \$\{APP_ROLE\}/);
  assert.match(text, /await client\.query\("BEGIN"\);\s*await setContext\(client, scope\);/);
});
