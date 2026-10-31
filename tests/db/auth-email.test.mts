// E-mail (Fase 2, item 3): recuperação de senha, verificação, limites, versão
// da sessão e o adaptador de desenvolvimento (caixa de saída).
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SKIP, setupSchema } from "./setup.mts";
import { makeTeacher, type TeacherFixture } from "./fixtures.mts";
import { clientIp } from "../../server/http/ip.ts";
import { hashToken, looksLikeToken, newToken, sessionIsCurrent } from "../../server/auth/tokens.ts";
import { mailMode, outboxMailer } from "../../server/mail/index.ts";

const BASE = "http://localhost:3000";
const tokenFrom = (text: string, route: string) => {
  const m = text.match(new RegExp(`${BASE}/${route}/([A-Za-z0-9_-]+)`));
  assert.ok(m, `link /${route}/ não encontrado no e-mail`);
  return m[1];
};

test("IP: usa só os cabeçalhos da Vercel, nunca o primeiro x-forwarded-for", () => {
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4" })), "local");
  assert.equal(clientIp(new Headers({ "x-vercel-forwarded-for": "200.1.2.3", "x-forwarded-for": "1.2.3.4" })), "200.1.2.3");
  assert.equal(clientIp(new Headers({ "x-real-ip": "2804:14d::1" })), "2804:14d::1");
  assert.equal(clientIp(new Headers({ "x-real-ip": "<script>" })), "local");
  assert.equal(clientIp(new Headers()), "local");
});

test("token: 32 bytes no link, só o hash guardado; versão da sessão", () => {
  const { raw, hash } = newToken();
  assert.ok(looksLikeToken(raw));
  assert.equal(hash, hashToken(raw));
  assert.notEqual(hash, raw);
  assert.ok(!looksLikeToken(`${raw}'`) && !looksLikeToken("abc"));
  assert.ok(sessionIsCurrent({ sessionVersion: 1 }, undefined), "cookie antigo sem versão vale enquanto a conta está na versão 1");
  assert.ok(!sessionIsCurrent({ sessionVersion: 2 }, undefined));
  assert.ok(!sessionIsCurrent({ sessionVersion: 3 }, 2));
  assert.ok(sessionIsCurrent({ sessionVersion: 3 }, 3));
});

test("adaptador de desenvolvimento grava o e-mail na caixa de saída", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "outbox-"));
  try {
    await outboxMailer(dir).send({ to: "a@b.c", subject: "Docentia: teste", text: "link http://x/y", html: "<p>x</p>" });
    const files = fs.readdirSync(dir);
    assert.equal(files.length, 1);
    const saved = JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf8"));
    assert.equal(saved.to, "a@b.c");
    assert.equal(saved.subject, "Docentia: teste");
    assert.equal(saved.text, "link http://x/y");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("modo do e-mail: Vercel sem SMTP não grava em disco", () => {
  const keep = { VERCEL: process.env.VERCEL, SMTP_HOST: process.env.SMTP_HOST };
  try {
    delete process.env.SMTP_HOST;
    process.env.VERCEL = "1";
    assert.equal(mailMode(), "off");
    delete process.env.VERCEL;
    assert.equal(mailMode(), "outbox");
  } finally {
    for (const [k, v] of Object.entries(keep)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

describe("recuperação de senha e verificação", { skip: SKIP }, () => {
  let env: Awaited<ReturnType<typeof setupSchema>>;
  let A: TeacherFixture;
  let svc: typeof import("../../server/services/auth-email.ts");
  let repo: typeof import("../../server/db/repo.ts");
  let ipSeq = 0;
  const ip = () => `10.0.0.${++ipSeq}`;

  before(async () => {
    env = await setupSchema();
    repo = await import("../../server/db/repo.ts");
    svc = await import("../../server/services/auth-email.ts");
    A = await makeTeacher("a");
  });
  after(async () => env?.cleanup());

  async function resetLink(email: string): Promise<string> {
    // Os testes pedem vários links para o mesmo e-mail; o limite tem teste próprio.
    await env.admin.query(`DELETE FROM rate_limits WHERE key = $1`, [`reset:email:${email.toLowerCase()}`]);
    const res = await svc.requestPasswordReset(email, ip(), BASE);
    assert.equal(res.status, "ok");
    assert.ok("mail" in res && res.mail, "deveria gerar o e-mail");
    return tokenFrom(res.mail.text, "redefinir-senha");
  }

  test("e-mail inexistente recebe a mesma resposta, sem e-mail", async () => {
    const res = await svc.requestPasswordReset("ninguem@teste.local", ip(), BASE);
    assert.deepEqual(res, { status: "ok" });
  });

  test("redefinição: troca a senha, gasta o token e sobe a versão da sessão", async () => {
    const before = (await repo.users.get(A.teacherUser.id))!;
    const token = await resetLink(A.teacherUser.email.toUpperCase());
    assert.ok(await svc.resetTokenValid(token));
    // No banco só fica o hash.
    assert.equal(Number((await env.admin.query(`SELECT count(*) AS n FROM auth_tokens WHERE token_hash = $1`, [token])).rows[0].n), 0);
    const res = await svc.resetPassword(token, "novo-hash");
    assert.ok("user" in res);
    assert.equal(res.user.passwordHash, "novo-hash");
    assert.equal(res.user.sessionVersion, (before.sessionVersion ?? 1) + 1);
    assert.ok(!sessionIsCurrent(res.user, before.sessionVersion), "a sessão antiga deixa de valer");
    assert.ok(sessionIsCurrent(res.user, res.user.sessionVersion));
    assert.ok(res.user.emailVerifiedAt, "o link prova o e-mail");
  });

  test("token reutilizado é recusado", async () => {
    const token = await resetLink(A.teacherUser.email);
    assert.ok("user" in (await svc.resetPassword(token, "h1")));
    assert.deepEqual(await svc.resetPassword(token, "h2"), { error: "invalid" });
    assert.ok(!(await svc.resetTokenValid(token)));
    assert.equal((await repo.users.get(A.teacherUser.id))!.passwordHash, "h1");
  });

  test("token expirado é recusado", async () => {
    const token = await resetLink(A.teacherUser.email);
    await env.admin.query(`UPDATE auth_tokens SET expires_at = now() - interval '1 second' WHERE token_hash = $1`, [hashToken(token)]);
    assert.ok(!(await svc.resetTokenValid(token)));
    assert.deepEqual(await svc.resetPassword(token, "h3"), { error: "invalid" });
  });

  test("token inexistente ou alterado é recusado", async () => {
    assert.deepEqual(await svc.resetPassword(newToken().raw, "h4"), { error: "invalid" });
    assert.deepEqual(await svc.resetPassword("nao-e-token", "h4"), { error: "invalid" });
    const token = await resetLink(A.teacherUser.email);
    const altered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    assert.deepEqual(await svc.resetPassword(altered, "h4"), { error: "invalid" });
    assert.ok(await svc.resetTokenValid(token), "o original continua valendo");
  });

  test("pedir um novo link invalida o anterior", async () => {
    const first = await resetLink(A.teacherUser.email);
    const second = await resetLink(A.teacherUser.email);
    assert.ok(!(await svc.resetTokenValid(first)));
    assert.ok(await svc.resetTokenValid(second));
  });

  test("limite: 3 pedidos por e-mail por hora", async () => {
    const B = await makeTeacher("b");
    for (let i = 0; i < 3; i++) assert.equal((await svc.requestPasswordReset(B.teacherUser.email, ip(), BASE)).status, "ok");
    assert.deepEqual(await svc.requestPasswordReset(B.teacherUser.email, ip(), BASE), { status: "rate_limited" });
    // Vale também para e-mail que não existe (não revela se existe).
    for (let i = 0; i < 3; i++) await svc.requestPasswordReset("fantasma@teste.local", ip(), BASE);
    assert.deepEqual(await svc.requestPasswordReset("fantasma@teste.local", ip(), BASE), { status: "rate_limited" });
  });

  test("limite: 10 pedidos por IP por hora", async () => {
    const same = "192.0.2.77";
    for (let i = 0; i < 10; i++) assert.equal((await svc.requestPasswordReset(`x${i}@teste.local`, same, BASE)).status, "ok");
    assert.deepEqual(await svc.requestPasswordReset("outro@teste.local", same, BASE), { status: "rate_limited" });
  });

  test("verificação de e-mail do professor (uso único) e reenvio", async () => {
    const C = await makeTeacher("c");
    assert.equal((await repo.users.get(C.teacherUser.id))!.emailVerifiedAt, "", "cadastro novo começa sem verificação");
    const sent = await svc.resendVerification(C.teacherUser.id, BASE);
    assert.equal(sent.status, "ok");
    const token = tokenFrom("mail" in sent ? sent.mail.text : "", "verificar-email");
    assert.ok(!(await svc.resetTokenValid(token)), "token de verificação não serve para redefinir senha");
    assert.ok(await svc.confirmEmail(token));
    assert.ok(!(await svc.confirmEmail(token)), "segundo uso é recusado");
    assert.ok((await repo.users.get(C.teacherUser.id))!.emailVerifiedAt);
    assert.deepEqual(await svc.resendVerification(C.teacherUser.id, BASE), { status: "already" });
  });

  test("link do admin só para professor", async () => {
    const ok = await svc.adminResetLink(A.teacherUser.id, BASE);
    assert.ok("mail" in ok && ok.mail.to === A.teacherUser.email);
    assert.deepEqual(await svc.adminResetLink(A.studentUser.id, BASE), { error: "not_found" });
  });

  test("limite de login por janela", async () => {
    const key = `login:${A.teacherUser.email}`;
    await repo.withScope(null, async (r) => {
      assert.equal(await r.rateLimits.peek(key, 60_000), 0);
      for (let i = 1; i <= 5; i++) assert.equal(await r.rateLimits.hit(key, 60_000), i);
      assert.equal(await r.rateLimits.peek(key, 60_000), 5);
      await r.rateLimits.clear(key);
      assert.equal(await r.rateLimits.peek(key, 60_000), 0);
    });
    // Janela vencida recomeça a contagem.
    await repo.withScope(null, (r) => r.rateLimits.hit(key, 60_000));
    await env.admin.query(`UPDATE rate_limits SET window_start = now() - interval '2 minutes' WHERE key = $1`, [key]);
    assert.equal(await repo.withScope(null, (r) => r.rateLimits.peek(key, 60_000)), 0);
    assert.equal(await repo.withScope(null, (r) => r.rateLimits.hit(key, 60_000)), 1);
  });
});
