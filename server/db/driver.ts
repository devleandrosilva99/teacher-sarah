import "server-only";
import fs from "node:fs";
import path from "node:path";

// Armazenamento chave → hash (campo → JSON). Três implementações:
// - redis: Upstash/Vercel KV via REST, quando as variáveis de ambiente existem;
// - file: .data/db.json, padrão em desenvolvimento (sobrevive a reinícios);
// - memory: padrão na Vercel sem Redis. Os dados se perdem quando a função
//   é reciclada, então serve apenas para demonstração.
export interface Driver {
  kind: "redis" | "file" | "memory";
  hgetall(key: string): Promise<Record<string, string>>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<void>;
  hdel(key: string, field: string): Promise<void>;
  /** Grava só se a chave não existir. Retorna true se gravou. */
  setnx(key: string, value: string): Promise<boolean>;
  get(key: string): Promise<string | null>;
}

type Data = Record<string, Record<string, string> | string>;

class MemoryDriver implements Driver {
  kind: Driver["kind"] = "memory";
  constructor(protected data: Data = {}) {}

  protected hash(key: string): Record<string, string> {
    const v = this.data[key];
    if (v && typeof v === "object") return v;
    const h: Record<string, string> = {};
    this.data[key] = h;
    return h;
  }
  protected persist() {}

  async hgetall(key: string) {
    return { ...this.hash(key) };
  }
  async hget(key: string, field: string) {
    return this.hash(key)[field] ?? null;
  }
  async hset(key: string, field: string, value: string) {
    this.hash(key)[field] = value;
    this.persist();
  }
  async hdel(key: string, field: string) {
    delete this.hash(key)[field];
    this.persist();
  }
  async setnx(key: string, value: string) {
    if (key in this.data) return false;
    this.data[key] = value;
    this.persist();
    return true;
  }
  async get(key: string) {
    const v = this.data[key];
    return typeof v === "string" ? v : null;
  }
}

class FileDriver extends MemoryDriver {
  kind: Driver["kind"] = "file";
  constructor(private file: string) {
    let data: Data = {};
    try {
      data = JSON.parse(fs.readFileSync(file, "utf8")) as Data;
    } catch {
      // arquivo ainda não existe
    }
    super(data);
  }
  protected persist() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data));
  }
}

class RedisRestDriver implements Driver {
  kind: Driver["kind"] = "redis";
  constructor(private url: string, private token: string) {}

  private async cmd<T>(...args: string[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    const body = (await res.json()) as { result?: T; error?: string };
    if (!res.ok || body.error) {
      throw new Error(`Redis: ${body.error ?? res.statusText}`);
    }
    return body.result as T;
  }

  async hgetall(key: string) {
    const flat = await this.cmd<string[]>("HGETALL", key);
    const out: Record<string, string> = {};
    for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
    return out;
  }
  async hget(key: string, field: string) {
    return this.cmd<string | null>("HGET", key, field);
  }
  async hset(key: string, field: string, value: string) {
    await this.cmd("HSET", key, field, value);
  }
  async hdel(key: string, field: string) {
    await this.cmd("HDEL", key, field);
  }
  async setnx(key: string, value: string) {
    return (await this.cmd<string | null>("SET", key, value, "NX")) === "OK";
  }
  async get(key: string) {
    return this.cmd<string | null>("GET", key);
  }
}

const g = globalThis as unknown as { __tsDriver?: Driver };

export function getDriver(): Driver {
  if (g.__tsDriver) return g.__tsDriver;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    g.__tsDriver = new RedisRestDriver(url, token);
  } else if (process.env.VERCEL) {
    g.__tsDriver = new MemoryDriver();
  } else {
    g.__tsDriver = new FileDriver(path.join(process.cwd(), ".data", "db.json"));
  }
  return g.__tsDriver;
}
