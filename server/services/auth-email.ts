import "server-only";
import { withScope, type Repo } from "@/server/db/repo";
import { hashToken, looksLikeToken, newToken, RESET_TTL_MS, VERIFY_TTL_MS } from "@/server/auth/tokens";
import { mailAvailable, type MailMessage } from "@/server/mail";
import { passwordResetEmail, verifyEmail } from "@/server/mail/templates";
import type { User } from "@/lib/types";

// Fluxos que dependem de e-mail: redefinição de senha, verificação do e-mail
// do professor e link de redefinição enviado pelo admin. Estas funções não
// enviam nada: devolvem a mensagem pronta, e a ação a envia depois da
// resposta (after()), para que o tempo de resposta não revele se a conta existe.
// Tabelas usadas (users, auth_tokens, rate_limits) são globais: escopo null.

const HOUR = 60 * 60_000;
export const LIMITS = {
  resetPerEmail: { max: 3, windowMs: HOUR },
  resetPerIp: { max: 10, windowMs: HOUR },
  verifyResend: { max: 3, windowMs: HOUR },
  loginFails: { max: 5, windowMs: 15 * 60_000 },
};

export type ResetRequest = { status: "ok"; mail?: MailMessage } | { status: "rate_limited" } | { status: "unavailable" };

/**
 * Pedido de redefinição. A resposta é a mesma exista ou não a conta; o limite
 * conta os pedidos por e-mail e por IP, existindo a conta ou não.
 */
export async function requestPasswordReset(email: string, ip: string, base: string): Promise<ResetRequest> {
  if (!mailAvailable()) return { status: "unavailable" };
  const em = email.trim().toLowerCase();
  return withScope(null, async (r) => {
    const perIp = await r.rateLimits.hit(`reset:ip:${ip}`, LIMITS.resetPerIp.windowMs);
    const perEmail = await r.rateLimits.hit(`reset:email:${em}`, LIMITS.resetPerEmail.windowMs);
    if (perIp > LIMITS.resetPerIp.max || perEmail > LIMITS.resetPerEmail.max) return { status: "rate_limited" as const };
    const user = await r.users.byEmail(em);
    if (!user || user.blocked) return { status: "ok" as const };
    const link = await issueToken(r, user, "password_reset", base);
    return { status: "ok" as const, mail: passwordResetEmail(user.email, user.name, link) };
  });
}

/** O link de redefinição ainda vale? (para a página mostrar o formulário ou o aviso) */
export async function resetTokenValid(raw: string): Promise<boolean> {
  if (!looksLikeToken(raw)) return false;
  return !!(await withScope(null, (r) => r.authTokens.peek(hashToken(raw), "password_reset")));
}

/**
 * Troca a senha pelo link: gasta o token (uso único), grava a senha, sobe a
 * versão da sessão (as outras sessões caem) e confirma o e-mail (o link
 * provou que a pessoa o recebe). Tudo numa transação.
 */
export async function resetPassword(raw: string, passwordHash: string): Promise<{ user: User } | { error: "invalid" }> {
  if (!looksLikeToken(raw)) return { error: "invalid" };
  return withScope(null, async (r) => {
    const userId = await r.authTokens.consume(hashToken(raw), "password_reset");
    if (!userId) return { error: "invalid" as const };
    const user = await r.users.setPassword(userId, passwordHash, { verifyEmail: true });
    if (!user || user.blocked) return { error: "invalid" as const };
    await r.rateLimits.clear(`login:${user.email}`);
    return { user };
  });
}

/** Cria o token de verificação e devolve o e-mail (no cadastro e no reenvio). */
export async function emailVerification(r: Repo, user: User, base: string): Promise<MailMessage> {
  const link = await issueToken(r, user, "email_verify", base);
  return verifyEmail(user.email, user.name, link);
}

export type ResendResult = { status: "ok"; mail: MailMessage } | { status: "already" | "rate_limited" | "unavailable" };

export async function resendVerification(userId: string, base: string): Promise<ResendResult> {
  if (!mailAvailable()) return { status: "unavailable" };
  return withScope(null, async (r) => {
    const user = await r.users.get(userId);
    if (!user || user.emailVerifiedAt) return { status: "already" as const };
    if ((await r.rateLimits.hit(`verify:${user.id}`, LIMITS.verifyResend.windowMs)) > LIMITS.verifyResend.max) {
      return { status: "rate_limited" as const };
    }
    return { status: "ok" as const, mail: await emailVerification(r, user, base) };
  });
}

/** Confirma o e-mail pelo link (uso único). */
export async function confirmEmail(raw: string): Promise<boolean> {
  if (!looksLikeToken(raw)) return false;
  return withScope(null, async (r) => {
    const userId = await r.authTokens.consume(hashToken(raw), "email_verify");
    if (!userId) return false;
    await r.users.markEmailVerified(userId);
    return true;
  });
}

/** O admin manda ao professor um link de redefinição; nunca vê nem define a senha. */
export async function adminResetLink(userId: string, base: string): Promise<{ mail: MailMessage } | { error: string }> {
  if (!mailAvailable()) return { error: "unavailable" };
  return withScope(null, async (r) => {
    const user = await r.users.get(userId);
    if (!user || user.role !== "teacher") return { error: "not_found" };
    const link = await issueToken(r, user, "password_reset", base);
    return { mail: passwordResetEmail(user.email, user.name, link, true) };
  });
}

async function issueToken(r: Repo, user: User, purpose: "password_reset" | "email_verify", base: string): Promise<string> {
  const { raw, hash } = newToken();
  await r.authTokens.create(user.id, purpose, hash, purpose === "password_reset" ? RESET_TTL_MS : VERIFY_TTL_MS);
  return `${base}/${purpose === "password_reset" ? "redefinir-senha" : "verificar-email"}/${raw}`;
}
