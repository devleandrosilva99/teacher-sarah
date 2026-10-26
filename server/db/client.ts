import "server-only";
import pg from "pg";
import { attachDatabasePool } from "@vercel/functions";

// Conexão com o PostgreSQL (Neon).
//
// O app usa DATABASE_URL (pooler do Neon, PgBouncer em modo transação). Nesse
// modo um SET de sessão se perde entre consultas, então o contexto da RLS é
// definido com set_config(..., true), que vale só dentro da transação. Por isso
// todo acesso aos dados passa por withScope(), que abre uma transação.

// numeric → number (pontos e notas); date → "AAAA-MM-DD" (sem fuso);
// timestamptz → string ISO, como o resto do app espera.
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1184, (v) => (v === null ? null : new Date(v).toISOString()));

export type Scope =
  | string // id do professor
  | { teacherId: string; studentId?: string }
  | { system: true }
  | null; // sem contexto: só tabelas globais

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  one<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T | null>;
}

interface Config {
  connectionString?: string;
  /** Schema alternativo (usado pelos testes). */
  schema?: string;
  autoSeed: boolean;
}

const g = globalThis as unknown as { __tsPool?: pg.Pool; __tsDbConfig?: Config; __tsReady?: Promise<void> | null };
const config: Config = (g.__tsDbConfig ??= { autoSeed: true });

/** Usado pelos testes e scripts: outra URL, outro schema, sem seed automático. */
export function configureDb(c: Partial<Config>) {
  Object.assign(config, c);
  if (g.__tsPool) {
    void g.__tsPool.end();
    g.__tsPool = undefined;
  }
  g.__tsReady = null;
}

function pool(): pg.Pool {
  if (g.__tsPool) return g.__tsPool;
  const connectionString = config.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não definida (veja .env.example).");
  const p = new pg.Pool({
    connectionString,
    max: 5,
    // Conexões ociosas fecham rápido; attachDatabasePool mantém a função da
    // Vercel viva o suficiente para isso acontecer (Fluid compute).
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });
  attachDatabasePool(p);
  g.__tsPool = p;
  return p;
}

export async function closeDb(): Promise<void> {
  if (g.__tsPool) await g.__tsPool.end();
  g.__tsPool = undefined;
  g.__tsReady = null;
}

function wrap(client: pg.PoolClient): Db {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await client.query(text, params)).rows as T[];
    },
    async one<T>(text: string, params: unknown[] = []) {
      return ((await client.query(text, params)).rows[0] as T) ?? null;
    },
  };
}

/**
 * Papel sem BYPASSRLS assumido em toda transação (ver migração 0001). O dono das
 * tabelas no Neon ignora a RLS; com SET LOCAL ROLE, as políticas passam a valer
 * até o fim da transação, inclusive através do pooler.
 */
export const APP_ROLE = "app_user";

async function setContext(client: pg.PoolClient, scope: Scope) {
  await client.query(`SET LOCAL ROLE ${APP_ROLE}`);
  let teacherId = "";
  let studentId = "";
  let system = "";
  if (typeof scope === "string") teacherId = scope;
  else if (scope && "system" in scope) system = "on";
  else if (scope) {
    teacherId = scope.teacherId;
    studentId = scope.studentId ?? "";
  }
  await client.query(
    `SELECT set_config('app.teacher_id', $1, true),
            set_config('app.student_id', $2, true),
            set_config('app.system', $3, true),
            set_config('search_path', $4, true)`,
    [teacherId, studentId, system, config.schema ?? "public"]
  );
}

/** Executa fn numa transação com o contexto de RLS definido. */
/** Com DB_TRACE=1, cada transação escreve no log quantas idas ao banco fez e quanto tempo levou. */
const TRACE = process.env.DB_TRACE === "1";

function traced(client: pg.PoolClient): { client: pg.PoolClient; done: (label: string) => void } {
  if (!TRACE) return { client, done: () => {} };
  let count = 0;
  const start = performance.now();
  const original = client.query.bind(client) as (...args: unknown[]) => unknown;
  const proxy = new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "query") return (...args: unknown[]) => (count++, original(...args));
      return Reflect.get(target, prop, receiver);
    },
  });
  return { client: proxy, done: (label) => console.log(`[db] ${label} idas=${count} ms=${(performance.now() - start).toFixed(1)}`) };
}

export async function transaction<T>(scope: Scope, fn: (db: Db) => Promise<T>, opts: { skipReady?: boolean } = {}): Promise<T> {
  if (!opts.skipReady) await ensureReady();
  const { client, done } = traced(await pool().connect());
  try {
    await client.query("BEGIN");
    await setContext(client, scope);
    const result = await fn(wrap(client));
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    done("tx");
    client.release();
  }
}

/**
 * Na primeira vez que o banco é usado, cria o administrador e os dados de
 * demonstração. A marca em app_meta é gravada na mesma transação do seed:
 * se o seed falhar, nada fica pela metade; outra instância que tente ao mesmo
 * tempo espera a primeira terminar e não repete.
 */
async function ensureReady(): Promise<void> {
  if (!config.autoSeed) return;
  g.__tsReady ??= transaction(
    { system: true },
    async (db) => {
      const fresh = await db.one(
        `INSERT INTO app_meta (key, value) VALUES ('seeded', now()::text) ON CONFLICT (key) DO NOTHING RETURNING key`
      );
      if (fresh) {
        const { seed } = await import("./seed");
        await seed(db);
      }
    },
    { skipReady: true }
  ).catch((err) => {
    g.__tsReady = null;
    throw err;
  });
  await g.__tsReady;
}
