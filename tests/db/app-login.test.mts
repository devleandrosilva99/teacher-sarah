// Papel com login próprio (Fase 2, item 6): app_login não é dono de nada, não
// ignora a RLS e só ganha acesso ao assumir app_user. Um RESET ROLE dentro da
// transação volta para app_login, que não lê nenhuma tabela nem desliga a RLS.
// Testado pelo pooler do Neon (como o app usa) e pela conexão direta.
// Sem DATABASE_APP_URL no .env.local (npm run db:app-login), é pulado.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { DB_URL, SKIP, setupSchema } from "./setup.mts";
import { makeTeacher } from "./fixtures.mts";

const APP_URL = process.env.DATABASE_APP_URL ?? "";
const skip = SKIP || (APP_URL ? false : "DATABASE_APP_URL não definida: rode npm run db:app-login.");

function directUrl(url: string): string {
  const u = new URL(url);
  u.hostname = u.hostname.replace("-pooler.", ".");
  return u.toString();
}

const denied = (e: { code?: string }) => e.code === "42501";

describe("papel app_login", { skip }, () => {
  let env: Awaited<ReturnType<typeof setupSchema>>;
  // Nomes qualificados: pelo pooler, um SET search_path de sessão não vale entre transações.
  const t = (name: string) => `"${env.schema}".${name}`;
  const owner = DB_URL ? decodeURIComponent(new URL(DB_URL).username) : "";

  before(async () => {
    env = await setupSchema();
  });
  after(async () => env?.cleanup());

  for (const [via, url] of [["pooler", APP_URL], ["conexão direta", directUrl(APP_URL)]] as const) {
    describe(`via ${via}`, () => {
      let c: pg.Client;
      before(async () => {
        assert.ok(via === "pooler" ? url.includes("-pooler.") : !url.includes("-pooler."), "URL do tipo certo");
        c = new pg.Client({ connectionString: url });
        await c.connect();
      });
      after(async () => c?.end());

      test("entra como app_login, sem acesso às tabelas", async () => {
        const who = (await c.query(`SELECT current_user AS cur, session_user AS ses`)).rows[0];
        assert.deepEqual(who, { cur: "app_login", ses: "app_login" });
        await assert.rejects(c.query(`SELECT count(*) FROM ${t("students")}`), denied);
        await assert.rejects(c.query(`SELECT count(*) FROM ${t("users")}`), denied);
      });

      test("assume app_user só na transação; RESET ROLE volta para app_login, não para o dono", async () => {
        await c.query("BEGIN");
        try {
          await c.query(`SELECT set_config('role', 'app_user', true), set_config('search_path', $1, true)`, [env.schema]);
          assert.equal((await c.query(`SELECT current_user AS u`)).rows[0].u, "app_user");
          // Sem contexto de professor, a RLS não devolve nada.
          assert.equal(Number((await c.query(`SELECT count(*) AS n FROM ${t("students")}`)).rows[0].n), 0);
          await c.query(`RESET ROLE`);
          assert.equal((await c.query(`SELECT current_user AS u`)).rows[0].u, "app_login");
          await assert.rejects(c.query(`SELECT count(*) FROM ${t("students")}`), denied);
        } finally {
          await c.query("ROLLBACK");
        }
        assert.equal((await c.query(`SELECT current_user AS u`)).rows[0].u, "app_login", "o papel não vaza para fora da transação");
      });

      test("não desliga a RLS nem assume o papel do dono", async () => {
        await assert.rejects(c.query(`ALTER TABLE ${t("students")} DISABLE ROW LEVEL SECURITY`), denied);
        await c.query("BEGIN");
        try {
          await c.query(`SET LOCAL ROLE app_user`);
          await assert.rejects(c.query(`ALTER TABLE ${t("students")} NO FORCE ROW LEVEL SECURITY`), denied);
        } finally {
          await c.query("ROLLBACK");
        }
        await assert.rejects(c.query(`SET ROLE "${owner}"`), denied);
        const attrs = (await c.query(`SELECT rolbypassrls, rolsuper, rolinherit FROM pg_roles WHERE rolname = 'app_login'`)).rows[0];
        assert.deepEqual(attrs, { rolbypassrls: false, rolsuper: false, rolinherit: false });
      });
    });
  }

  test("conectado como dono, o painel do admin percebe (e mostra o aviso)", async () => {
    const repo = await import("../../server/db/repo.ts");
    const conn = await repo.withScope({ system: true }, (r) => r.meta.connection());
    assert.equal(conn.login, owner);
    assert.ok(conn.owner || conn.bypass);
  });

  test("o app funciona inteiro com DATABASE_APP_URL (e a RLS isola os professores)", async () => {
    const { configureDb } = await import("../../server/db/client.ts");
    configureDb({ connectionString: APP_URL, schema: env.schema, autoSeed: false });
    const repo = await import("../../server/db/repo.ts");
    const A = await makeTeacher("a");
    const B = await makeTeacher("b");
    const conn = await repo.withScope(A.teacher.id, (r) => r.meta.connection());
    assert.deepEqual(conn, { login: "app_login", bypass: false, owner: false });
    assert.deepEqual((await repo.students.all(A.teacher.id)).map((s) => s.id), [A.student.id]);
    assert.equal(await repo.students.get(B.teacher.id, A.student.id), null);
  });
});
