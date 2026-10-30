// Papel com login próprio para o app (Fase 2, item 6).
//
//   npm run db:app-login                                            branch dev (.env.local)
//   npm run db:app-login -- --env-file=.env.producao.local --confirmar   outro banco
//   ... --rotate                                                    troca a senha de um papel já criado
//
// Cria (como dono, pela conexão direta) o papel app_login: LOGIN, NOINHERIT,
// NOBYPASSRLS, sem ser dono de nada, membro de app_user só com SET. Sozinho ele
// não lê nenhuma tabela; o app assume app_user em cada transação, e um
// RESET ROLE volta para um papel sem acesso (nunca para o dono).
//
// A senha é gerada aqui e vai direto para o arquivo de ambiente como
// DATABASE_APP_URL (pelo pooler, a partir de DATABASE_URL). Ela nunca é
// impressa. Não use o console do Neon para criar este papel: papéis criados
// por lá entram em neon_superuser, que ignora a RLS.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { loadEnv } from "./migrate.mjs";

const ROLE = "app_login";

function upsertEnv(file, key, value) {
  const text = fs.readFileSync(file, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  const next = re.test(text) ? text.replace(re, line) : `${text.replace(/\s*$/, "")}${eol}${eol}# Papel do app sem privilégios de dono (npm run db:app-login).${eol}${line}${eol}`;
  fs.writeFileSync(file, next);
}

async function main() {
  const args = process.argv.slice(2);
  const envFile = args.find((a) => a.startsWith("--env-file="))?.split("=")[1] ?? ".env.local";
  const confirmed = args.includes("--confirmar");
  const rotate = args.includes("--rotate");
  loadEnv(envFile);
  const owner = process.env.DATABASE_URL_UNPOOLED;
  const pooled = process.env.DATABASE_URL;
  if (!owner || !pooled) throw new Error(`DATABASE_URL e DATABASE_URL_UNPOOLED precisam estar em ${envFile}.`);
  const { hostname, pathname } = new URL(owner);
  console.log(`Banco: ${hostname}${pathname}  (arquivo ${envFile})`);
  if (envFile !== ".env.local" && !confirmed) {
    throw new Error("Este não é o banco de desenvolvimento. Confira o host acima e repita com --confirmar.");
  }

  const client = new pg.Client({ connectionString: owner });
  await client.connect();
  try {
    const exists = (await client.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [ROLE])).rowCount > 0;
    if (exists && !rotate) throw new Error(`O papel ${ROLE} já existe. Para gerar uma senha nova, repita com --rotate.`);
    const password = crypto.randomBytes(30).toString("base64url");
    // CREATE/ALTER ROLE não aceitam parâmetros, então a senha vai como literal
    // (só [A-Za-z0-9_-]). Ela vai em texto porque o Neon intercepta o comando e
    // repassa a senha ao painel dele, que não aceita verificador SCRAM.
    if (!/^[A-Za-z0-9_-]+$/.test(password)) throw new Error("senha gerada em formato inesperado");
    await client.query("BEGIN");
    if (exists) {
      await client.query(`ALTER ROLE ${ROLE} WITH LOGIN NOINHERIT NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password}'`);
    } else {
      await client.query(`CREATE ROLE ${ROLE} WITH LOGIN NOINHERIT NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password}'`);
    }
    await client.query(`GRANT app_user TO ${ROLE} WITH INHERIT FALSE, SET TRUE`);
    const check = (
      await client.query(
        `SELECT r.rolbypassrls, r.rolsuper, r.rolinherit,
                (SELECT count(*)::int FROM pg_auth_members m JOIN pg_roles g ON g.oid = m.roleid
                  WHERE m.member = r.oid AND g.rolname <> 'app_user') AS other_groups,
                (SELECT count(*)::int FROM pg_class c WHERE c.relowner = r.oid) AS owns
           FROM pg_roles r WHERE r.rolname = $1`,
        [ROLE]
      )
    ).rows[0];
    if (check.rolbypassrls || check.rolsuper || check.rolinherit || check.other_groups > 0 || check.owns > 0) {
      throw new Error(`O papel ${ROLE} ficou com privilégios demais: ${JSON.stringify(check)}`);
    }
    await client.query("COMMIT");

    const url = new URL(pooled);
    url.username = ROLE;
    url.password = password;
    upsertEnv(path.resolve(envFile), "DATABASE_APP_URL", url.toString());
    console.log(`Papel ${ROLE} ${exists ? "com senha nova" : "criado"}; DATABASE_APP_URL gravada em ${envFile} (pelo pooler).`);
    console.log("A senha não foi exibida. Para a Vercel, copie o valor do arquivo direto para a variável.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
});
