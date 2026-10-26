import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Tokens dos links de e-mail: 32 bytes aleatórios no link; no banco, só o
// SHA-256. Quem lê o banco não consegue usar um link.

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function newToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

/** Formato do token no link; qualquer outra coisa nem chega ao banco. */
export function looksLikeToken(raw: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(raw);
}

export const RESET_TTL_MS = 60 * 60_000;
export const VERIFY_TTL_MS = 24 * 60 * 60_000;

/** A sessão vale se foi criada na versão atual da conta (cookies antigos sem versão = 1). */
export function sessionIsCurrent(user: { sessionVersion?: number }, cookieVersion: number | undefined): boolean {
  return (cookieVersion ?? 1) === (user.sessionVersion ?? 1);
}
