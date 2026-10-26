import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { meta, teachers, users, withScope } from "@/server/db/repo";
import type { Role, Student, Teacher, User } from "@/lib/types";

export const SESSION_COOKIE = "ts_session";
const MAX_AGE_S = 60 * 60 * 24 * 14;

interface Payload {
  uid: string;
  role: Role;
  exp: number;
}

async function secret(): Promise<string> {
  return process.env.SESSION_SECRET || (await meta.secret());
}

function sign(data: string, key: string): string {
  return createHmac("sha256", key).update(data).digest("base64url");
}

export async function createSession(user: User): Promise<void> {
  const payload: Payload = {
    uid: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_S,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${data}.${sign(data, await secret())}`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

async function readPayload(): Promise<Payload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = Buffer.from(sign(data, await secret()));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as Payload;
    return p.exp > Date.now() / 1000 ? p : null;
  } catch {
    return null;
  }
}

/** Usuário logado (ou null). Contas bloqueadas contam como deslogadas. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const p = await readPayload();
  if (!p) return null;
  const user = await users.get(p.uid);
  if (!user || user.blocked) return null;
  return user;
});

export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : role === "teacher" ? "/professor" : "/aluno";
}

/**
 * Cadastro de aluno ligado a uma conta de login. A conta não sabe a que
 * professor pertence, então esta busca usa o escopo system, de forma restrita:
 * só por user_id.
 */
export const studentForUser = cache(async (userId: string): Promise<Student | null> => {
  return withScope({ system: true }, (r) => r.students.byUserId(userId));
});

export const requireTeacher = cache(async (): Promise<{ user: User; teacher: Teacher }> => {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (user.role !== "teacher") redirect(homeFor(user.role));
  const teacher = await teachers.byUserId(user.id);
  if (!teacher) redirect("/sair");
  return { user, teacher };
});

export interface StudentContext {
  user: User;
  student: Student;
  teacher: Teacher;
  /** Escopo de RLS do aluno: use nas consultas das telas do aluno. */
  scope: { teacherId: string; studentId: string };
}

export const requireStudent = cache(async (): Promise<StudentContext> => {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (user.role !== "student") redirect(homeFor(user.role));
  const student = await studentForUser(user.id);
  if (!student || student.status !== "active") redirect("/sair?m=arquivado");
  const teacher = await teachers.get(student.teacherId);
  if (!teacher) redirect("/sair?m=arquivado");
  const teacherUser = await users.get(teacher.userId);
  if (teacherUser?.blocked) redirect("/sair?m=bloqueado");
  return { user, student, teacher, scope: { teacherId: teacher.id, studentId: student.id } };
});

export const requireAdmin = cache(async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (user.role !== "admin") redirect(homeFor(user.role));
  return user;
});
