// npm run db:backup: gera um backup do banco com pg_dump (formato custom, -Fc).
//
//   npm run db:backup                               banco do .env.local, pasta padrão
//   npm run db:backup -- --dir=D:\Backups           outra pasta
//   npm run db:backup -- --env-file=.env.prod.local  outro banco
//   BACKUP_DIR=D:\Backups npm run db:backup
//
// Pasta padrão: ~/teacher-sarah-backups. O script recusa qualquer pasta dentro
// do repositório, para um dump nunca ir parar no git.
// Restaurar: pg_restore --clean --no-owner -d "<URL do banco>" arquivo.dump
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./migrate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg) {
  console.error(`Erro: ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
loadEnv(opt("env-file") ?? ".env.local");
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) fail("DATABASE_URL_UNPOOLED não definida.");

const dir = path.resolve(opt("dir") ?? process.env.BACKUP_DIR ?? path.join(os.homedir(), "teacher-sarah-backups"));
const rel = path.relative(ROOT, dir);
if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
  fail(`a pasta ${dir} fica dentro do repositório. Escolha uma pasta fora dele.`);
}

// pg_dump do PATH ou, no Windows, da instalação padrão mais nova
// (C:\Program Files\PostgreSQL\<versão>\bin), que o instalador não põe no PATH.
function findPgDump() {
  if (spawnSync("pg_dump", ["--version"]).status === 0) return "pg_dump";
  const base = path.join(process.env.ProgramFiles ?? "C:\\Program Files", "PostgreSQL");
  if (process.platform !== "win32" || !fs.existsSync(base)) return "pg_dump";
  const versions = fs.readdirSync(base).filter((v) => /^\d+$/.test(v)).sort((a, b) => Number(b) - Number(a));
  for (const v of versions) {
    const exe = path.join(base, v, "bin", "pg_dump.exe");
    if (fs.existsSync(exe)) return exe;
  }
  return "pg_dump";
}
const PG_DUMP = findPgDump();
const version = spawnSync(PG_DUMP, ["--version"], { encoding: "utf8" });
if (version.error || version.status !== 0) {
  fail(
    "pg_dump não encontrado. Instale as ferramentas de cliente do PostgreSQL na mesma versão principal do servidor " +
      "(o Neon usa a 18) ou mais nova. No Windows: instale o PostgreSQL 18 (instalador da EDB ou winget search PostgreSQL) " +
      'e adicione "C:\\Program Files\\PostgreSQL\\18\\bin" ao PATH. No macOS: brew install libpq.'
  );
}

// Com sslmode=verify-full (ou verify-ca), o libpq do pg_dump exige um arquivo
// de autoridades certificadoras. No Windows, "sslrootcert=system" não enxerga os
// certificados do sistema, então usamos os do próprio Node (tls.rootCertificates,
// que inclui a Let's Encrypt usada pelo Neon), num arquivo temporário. Só para o
// pg_dump: o driver pg do app não precisa disso.
let caFile = "";
const dumpUrl = new URL(url);
if (/^verify-(full|ca)$/.test(dumpUrl.searchParams.get("sslmode") ?? "") && !dumpUrl.searchParams.has("sslrootcert")) {
  caFile = path.join(os.tmpdir(), `teacher-sarah-ca-${process.pid}.pem`);
  fs.writeFileSync(caFile, tls.rootCertificates.join("\n"));
  dumpUrl.searchParams.set("sslrootcert", caFile);
}

fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const file = path.join(dir, `teacher-sarah-${stamp}.dump`);
const { hostname, pathname } = new URL(url);
console.log(`${version.stdout.trim()}\nBanco: ${hostname}${pathname}\nArquivo: ${file}`);

const run = spawnSync(PG_DUMP, ["--format=custom", "--no-owner", "--no-privileges", `--file=${file}`, dumpUrl.toString()], { stdio: "inherit" });
if (caFile) fs.rmSync(caFile, { force: true });
if (run.status !== 0) {
  fs.rmSync(file, { force: true });
  fail("pg_dump falhou (veja a mensagem acima). Se a versão do servidor for mais nova que a do pg_dump, atualize as ferramentas.");
}
console.log(`Backup concluído: ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
