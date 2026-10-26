"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";
import { invitations, teachers, users, withScope } from "@/server/db/repo";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession, getCurrentUser, homeFor, studentForUser } from "@/server/auth/session";
import { newId, nowIso, slugify } from "@/lib/format";
import { notify } from "@/server/services/notify";
import { createTeacherAccount } from "@/server/services/accounts";
import {
  LIMITS,
  emailVerification,
  requestPasswordReset as requestReset,
  resendVerification as resend,
  resetPassword as doReset,
} from "@/server/services/auth-email";
import { MAIL_UNAVAILABLE, mailAvailable, sendMail } from "@/server/mail";
import { clientIp } from "@/server/http/ip";
import { baseUrl } from "@/server/url";
import type { FormState } from "./state";

const email = z.email("E-mail inválido.").max(254).transform((v) => v.trim().toLowerCase());
const password = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(128);

function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos.";
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ email, password: z.string().min(1, "Informe a senha.").max(128) })
    .safeParse({ email: String(formData.get("email") ?? "").trim(), password: formData.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error), fields: { email: String(formData.get("email") ?? "") } };

  const { email: em, password: pw } = parsed.data;
  const key = `login:${em}`;
  const { windowMs, max } = LIMITS.loginFails;
  const [fails, user] = await withScope(null, async (r) => [await r.rateLimits.peek(key, windowMs), await r.users.byEmail(em)] as const);
  if (fails >= max) {
    return { error: "Muitas tentativas. Aguarde 15 minutos e tente de novo.", fields: { email: em } };
  }

  const valid = user ? await verifyPassword(pw, user.passwordHash) : false;
  if (!user || !valid) {
    await withScope(null, (r) => r.rateLimits.hit(key, windowMs));
    return { error: "E-mail ou senha incorretos.", fields: { email: em } };
  }
  if (user.blocked) return { error: "Esta conta está bloqueada. Fale com o suporte.", fields: { email: em } };
  if (user.role === "student") {
    const st = await studentForUser(user.id);
    if (!st || st.status !== "active") return { error: "Seu acesso foi encerrado pelo professor.", fields: { email: em } };
  }

  if (fails > 0) await withScope(null, (r) => r.rateLimits.clear(key));
  await createSession(user);
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(user.role));
}

export async function signupTeacher(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: formData.get("password"),
  };
  const parsed = z
    .object({ name: z.string().min(2, "Informe seu nome.").max(80), email, password })
    .safeParse(raw);
  const fields = { name: raw.name, email: raw.email };
  if (!parsed.success) return { error: firstError(parsed.error), fields };
  if (formData.get("terms") !== "on") return { error: "É preciso aceitar os termos de uso e a política de privacidade.", fields };
  if (await users.byEmail(parsed.data.email)) return { error: "Já existe uma conta com este e-mail.", fields };

  let slug = slugify(parsed.data.name) || "professor";
  for (let i = 2; await teachers.bySlug(slug); i++) slug = `${slugify(parsed.data.name)}-${i}`;

  // Conta, professor e disciplina inicial numa transação só.
  const teacherId = newId();
  const passwordHash = await hashPassword(parsed.data.password);
  const base = await baseUrl();
  const { user, mail } = await withScope(teacherId, async (r) => {
    const { user } = await createTeacherAccount(r, { teacherId, name: parsed.data.name, email: parsed.data.email, passwordHash, slug });
    // O link de confirmação sai depois da resposta; sem e-mail configurado, fica para depois.
    return { user, mail: mailAvailable() ? await emailVerification(r, user, base) : null };
  });
  if (mail) after(() => sendMail(mail).then(() => undefined));
  await createSession(user);
  redirect("/professor?bemvindo=1");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/entrar");
}

export async function acceptInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const inv = await invitations.get(token);
  if (!inv || inv.usedAt || new Date(inv.expiresAt).getTime() < Date.now()) {
    return { error: "Convite inválido ou expirado. Peça um novo ao seu professor." };
  }
  const pw = password.safeParse(formData.get("password"));
  if (!pw.success) return { error: firstError(pw.error) };
  if (pw.data !== formData.get("confirm")) return { error: "As senhas não conferem." };
  if (formData.get("terms") !== "on") return { error: "É preciso aceitar os termos de uso e a política de privacidade." };

  const hash = await hashPassword(pw.data);
  // Cria (ou atualiza) a conta, liga ao aluno, gasta o convite e avisa o
  // professor numa transação só, no escopo do professor do convite.
  const result = await withScope(inv.teacherId, async (r) => {
    const student = await r.students.get(inv.studentId);
    if (!student || student.status !== "active") return { error: "Este convite não é mais válido." };
    if (isMinor(student.birthDate) && formData.get("guardian") !== "on") {
      return { error: "Como você é menor de 18 anos, seu responsável precisa autorizar o uso." };
    }
    let user = student.userId ? await r.users.get(student.userId) : null;
    if (user) {
      // Nova senha por convite: as sessões antigas da conta caem.
      user = await r.users.setPassword(user.id, hash);
      if (!user) return { error: "Este convite não é mais válido." };
    } else {
      if (await r.users.byEmail(inv.email)) return { error: "Já existe uma conta com este e-mail. Fale com seu professor." };
      user = await r.users.create({
        id: newId(),
        email: inv.email,
        passwordHash: hash,
        role: "student",
        name: student.name,
        blocked: false,
        createdAt: nowIso(),
      });
      await r.students.put({ ...student, userId: user.id });
    }
    await r.invitations.put({ ...inv, usedAt: nowIso() });
    const teacher = await r.teachers.get(inv.teacherId);
    await notify(r, teacher?.userId, `${student.name} ativou a conta.`, `/professor/alunos/${student.id}`);
    return { user };
  });
  if ("error" in result) return { error: result.error };
  await createSession(result.user);
  redirect("/aluno");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const ok = await verifyPassword(String(formData.get("current") ?? ""), user.passwordHash);
  if (!ok) return { error: "Senha atual incorreta." };
  const pw = password.safeParse(formData.get("password"));
  if (!pw.success) return { error: firstError(pw.error) };
  if (pw.data !== formData.get("confirm")) return { error: "As senhas não conferem." };
  // Nova versão da sessão: as outras sessões abertas caem; esta recebe um cookie novo.
  const updated = await withScope(null, async (r) => r.users.setPassword(user.id, await hashPassword(pw.data)));
  if (updated) await createSession(updated);
  return { ok: "Senha alterada. As outras sessões abertas foram encerradas." };
}

const RESET_SENT = "Se houver uma conta com este e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora.";

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = String(formData.get("email") ?? "").trim();
  const parsed = email.safeParse(raw);
  if (!parsed.success) return { error: firstError(parsed.error), fields: { email: raw } };
  const res = await requestReset(parsed.data, clientIp(await headers()), await baseUrl());
  if (res.status === "unavailable") return { error: MAIL_UNAVAILABLE, fields: { email: raw } };
  if (res.status === "rate_limited") return { error: "Muitos pedidos. Aguarde uma hora e tente de novo.", fields: { email: raw } };
  // Mesma resposta exista ou não a conta; o envio acontece depois da resposta.
  const mail = res.mail;
  if (mail) after(() => sendMail(mail).then(() => undefined));
  return { ok: RESET_SENT };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const pw = password.safeParse(formData.get("password"));
  if (!pw.success) return { error: firstError(pw.error) };
  if (pw.data !== formData.get("confirm")) return { error: "As senhas não conferem." };
  const res = await doReset(token, await hashPassword(pw.data));
  if ("error" in res) return { error: "Este link é inválido, expirou ou já foi usado. Peça um novo." };
  await createSession(res.user);
  redirect(`${homeFor(res.user.role)}?senha=redefinida`);
}

export async function resendVerification(_prev: FormState): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const res = await resend(user.id, await baseUrl());
  if (res.status === "unavailable") return { error: MAIL_UNAVAILABLE };
  if (res.status === "already") return { ok: "Seu e-mail já está confirmado." };
  if (res.status !== "ok") return { error: "Você já pediu alguns reenvios. Aguarde uma hora." };
  const sent = await sendMail(res.mail);
  return sent ? { ok: `Enviamos um novo link para ${user.email}.` } : { error: "Não foi possível enviar agora. Tente mais tarde." };
}

function isMinor(birthDate: string): boolean {
  if (!birthDate) return false;
  const b = new Date(`${birthDate}T12:00:00Z`);
  if (Number.isNaN(b.getTime())) return false;
  const age = (Date.now() - b.getTime()) / (365.25 * 86_400_000);
  return age < 18;
}
