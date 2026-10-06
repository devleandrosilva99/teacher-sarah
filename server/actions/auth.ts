"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { invitations, loginAttempts, students, teachers, users } from "@/server/db/repo";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession, getCurrentUser, homeFor } from "@/server/auth/session";
import { newId, nowIso, slugify } from "@/lib/format";
import { notify } from "@/server/services/notify";
import type { FormState } from "./state";

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60_000;

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
  const attempts = await loginAttempts.get(em);
  const inWindow = Date.now() - attempts.first < WINDOW_MS;
  if (inWindow && attempts.count >= MAX_FAILS) {
    return { error: "Muitas tentativas. Aguarde 15 minutos e tente de novo.", fields: { email: em } };
  }

  const user = await users.byEmail(em);
  const valid = user ? await verifyPassword(pw, user.passwordHash) : false;
  if (!user || !valid) {
    await loginAttempts.set(em, inWindow ? { count: attempts.count + 1, first: attempts.first } : { count: 1, first: Date.now() });
    return { error: "E-mail ou senha incorretos.", fields: { email: em } };
  }
  if (user.blocked) return { error: "Esta conta está bloqueada. Fale com o suporte.", fields: { email: em } };
  if (user.role === "student" && user.teacherId && user.studentId) {
    const st = await students.get(user.teacherId, user.studentId);
    if (!st || st.status !== "active") return { error: "Seu acesso foi encerrado pelo professor.", fields: { email: em } };
  }

  await loginAttempts.clear(em);
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

  const userId = newId();
  const teacherId = newId();
  const user = await users.create({
    id: userId,
    email: parsed.data.email,
    passwordHash: await hashPassword(parsed.data.password),
    role: "teacher",
    name: parsed.data.name,
    teacherId,
    createdAt: nowIso(),
  });
  await teachers.save({ id: teacherId, userId, name: parsed.data.name, slug, bio: "", color: "#378ADD", createdAt: nowIso() });
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

  const student = await students.get(inv.teacherId, inv.studentId);
  if (!student || student.status !== "active") return { error: "Este convite não é mais válido." };
  if (isMinor(student.birthDate) && formData.get("guardian") !== "on") {
    return { error: "Como você é menor de 18 anos, seu responsável precisa autorizar o uso." };
  }

  let user = student.userId ? await users.get(student.userId) : null;
  const hash = await hashPassword(pw.data);
  if (user) {
    user = await users.put({ ...user, passwordHash: hash });
  } else {
    if (await users.byEmail(inv.email)) return { error: "Já existe uma conta com este e-mail. Fale com seu professor." };
    user = await users.create({
      id: newId(),
      email: inv.email,
      passwordHash: hash,
      role: "student",
      name: student.name,
      teacherId: inv.teacherId,
      studentId: student.id,
      createdAt: nowIso(),
    });
    await students.put({ ...student, userId: user.id });
  }
  await invitations.put({ ...inv, usedAt: nowIso() });
  const teacher = await teachers.get(inv.teacherId);
  if (teacher) await notify(teacher.userId, `${student.name} ativou a conta.`, `/professor/alunos/${student.id}`);
  await createSession(user);
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
  await users.put({ ...user, passwordHash: await hashPassword(pw.data) });
  return { ok: "Senha alterada." };
}

function isMinor(birthDate: string): boolean {
  if (!birthDate) return false;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return false;
  const age = (Date.now() - b.getTime()) / (365.25 * 86_400_000);
  return age < 18;
}
