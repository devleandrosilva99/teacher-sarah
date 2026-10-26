// Aplica as migrações SQL de db/migrations em ordem.
//
//   npm run db:migrate                                  usa .env.local (branch dev do Neon)
//   npm run db:migrate -- --env-file=.env.prod.local --confirmar   outro banco (ex.: produção)
//   npm run db:reset                                    APAGA o schema e recria (só com .env.local)
//
// Usa DATABASE_URL_UNPOOLED (conexão direta). Cada arquivo roda numa transação
// e fica registrado em schema_migrations; um advisory lock impede duas
// execuções ao mesmo tempo.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = path.join(ROOT, "db", "migrations");
const LOCK_ID = 727301; // número arbitrário e fixo para o advisory lock

/** Aplica as migrações pendentes. `schema` permite usar um schema de teste. */
export async function migrate(client, { schema = "public", log = console.log } = {}) {
  await client.query(`SELECT pg_advisory_lock($1)`, [LOCK_ID]);
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${ident(schema)}`);
    await client.query(`SET search_path TO ${ident(schema)}`);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`
    );
    const done = new Set((await client.query(`SELECT version FROM schema_migrations`)).rows.map((r) => r.version));
    const files = fs.readdirSync(MIGRATIONS).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
    let applied = 0;
    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      if (done.has(version)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (version) VALUES ($1)`, [version]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Falha em ${file}: ${err.message}`);
      }
      log(`  aplicada ${version}`);
      applied++;
    }
    if (!applied) log("  nada a aplicar: o banco já está atualizado.");
    return applied;
  } finally {
    await client.query(`SELECT pg_advisory_unlock($1)`, [LOCK_ID]);
  }
}

function ident(name) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`Nome de schema inválido: ${name}`);
  return `"${name}"`;
}

export function loadEnv(file) {
  const full = path.resolve(ROOT, file);
  if (!fs.existsSync(full)) throw new Error(`Arquivo ${file} não encontrado (crie a partir de .env.example).`);
  process.loadEnvFile(full);
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const envFile = opt("env-file") ?? ".env.local";
  const reset = args.includes("--reset");
  const confirmed = args.includes("--confirmar");

  loadEnv(envFile);
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error(`DATABASE_URL_UNPOOLED não definida em ${envFile}.`);
  const { hostname, pathname } = new URL(url);
  console.log(`Banco: ${hostname}${pathname}  (arquivo ${envFile})`);

  if (envFile !== ".env.local" && !confirmed) {
    throw new Error("Este não é o banco de desenvolvimento. Confira o host acima e repita com --confirmar.");
  }
  if (reset && envFile !== ".env.local") throw new Error("--reset só é permitido com .env.local (branch dev).");

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    if (reset) {
      console.log("  apagando o schema public (todos os dados)...");
      await client.query(`DROP SCHEMA IF EXISTS public CASCADE`);
      await client.query(`CREATE SCHEMA public`);
    }
    await migrate(client);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`Erro: ${err.message}`);
    process.exit(1);
  });
}
