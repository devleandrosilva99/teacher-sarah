// npm run db:seed: grava o administrador e os dados de demonstração no banco
// do .env.local (se ainda não existirem). Respeita SEED_DEMO=false.
import path from "node:path";
import { loadEnv } from "./migrate.mjs";

loadEnv(process.argv.find((a) => a.startsWith("--env-file="))?.split("=")[1] ?? ".env.local");
// Conexão direta: o seed é uma transação longa.
process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

const { configureDb, transaction, closeDb } = await import("../server/db/client");
const { seed } = await import("../server/db/seed");

configureDb({ autoSeed: false });
try {
  await transaction({ system: true }, async (db) => {
    await db.query(`INSERT INTO app_meta (key, value) VALUES ('seeded', now()::text) ON CONFLICT (key) DO NOTHING`);
    await seed(db);
  });
  console.log(`Seed concluído (${path.basename(process.cwd())}).`);
} finally {
  await closeDb();
}
