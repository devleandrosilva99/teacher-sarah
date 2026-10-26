// Ambiente dos testes de banco: um schema temporário test_<data>_<aleatório>
// na branch dev do Neon (DATABASE_URL_UNPOOLED do .env.local), com as
// migrações aplicadas. Sem a variável, os testes são pulados.
import fs from "node:fs";
import pg from "pg";
import { migrate } from "../../scripts/migrate.mjs";

if (!process.env.DATABASE_URL_UNPOOLED && fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
export const DB_URL = process.env.DATABASE_URL_UNPOOLED ?? "";
export const SKIP = DB_URL ? false : "DATABASE_URL_UNPOOLED não definida (.env.local): testes de banco pulados.";

const STALE_MS = 30 * 60_000;

export async function setupSchema(): Promise<{ schema: string; admin: pg.Client; cleanup: () => Promise<void> }> {
  const admin = new pg.Client({ connectionString: DB_URL });
  await admin.connect();
  // Apaga schemas de execuções anteriores interrompidas (mais de 30 min).
  const old = await admin.query<{ nspname: string }>(`SELECT nspname FROM pg_namespace WHERE nspname LIKE 'test\\_%'`);
  for (const { nspname } of old.rows) {
    const ts = Number(nspname.split("_")[1]);
    if (!ts || Date.now() - ts > STALE_MS) await admin.query(`DROP SCHEMA IF EXISTS "${nspname}" CASCADE`);
  }
  const schema = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await migrate(admin, { schema, log: () => {} });
  await admin.query(`SET search_path TO "${schema}"`);
  // Conexão de verificação dos testes: enxerga tudo (modo system).
  await admin.query(`SET app.system = 'on'`);

  const { configureDb, closeDb } = await import("../../server/db/client.ts");
  configureDb({ connectionString: DB_URL, schema, autoSeed: false });

  return {
    schema,
    admin,
    async cleanup() {
      await closeDb();
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    },
  };
}
