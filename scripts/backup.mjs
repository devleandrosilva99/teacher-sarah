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

const version = spawnSync("pg_dump", ["--version"], { encoding: "utf8" });
if (version.error || version.status !== 0) {
  fail(
    "pg_dump não encontrado. Instale as ferramentas de cliente do PostgreSQL na mesma versão principal do servidor " +
      "(o Neon usa a 18) ou mais nova. No Windows: instale o PostgreSQL 18 (instalador da EDB ou winget search PostgreSQL) " +
      'e adicione "C:\\Program Files\\PostgreSQL\\18\\bin" ao PATH. No macOS: brew install libpq.'
  );
}

fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const file = path.join(dir, `teacher-sarah-${stamp}.dump`);
const { hostname, pathname } = new URL(url);
console.log(`${version.stdout.trim()}\nBanco: ${hostname}${pathname}\nArquivo: ${file}`);

const run = spawnSync("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", `--file=${file}`, url], { stdio: "inherit" });
if (run.status !== 0) {
  fs.rmSync(file, { force: true });
  fail("pg_dump falhou (veja a mensagem acima). Se a versão do servidor for mais nova que a do pg_dump, atualize as ferramentas.");
}
console.log(`Backup concluído: ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
