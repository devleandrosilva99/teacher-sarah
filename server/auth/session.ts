import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { meta, withScope } from "@/server/db/repo";
import { sessionIsCurrent } from "./tokens";
import type { Role, Student, Teacher, User } from "@/lib/types";

export const SESSION_COOKIE = "ts_session";
const MAX_AGE_S = 60 * 60 * 24 * 14;

interface Payload {
  uid: string;
  role: Role;
  exp: number;
  /** Versão da conta quando a sessão foi criada (ver users.session_version). */
  v?: number;
}

const g = globalThis as unknown as { __tsSecret?: Promise<string> | null };

/** O segredo guardado no banco não muda: é lido uma vez por instância. */
async function secret(): Promise<string> {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  g.__tsSecret ??= meta.secret().catch((err) => {
    g.__tsSecret = null;
    throw err;
  });
  return g.__tsSecret;
}

function sign(data: string, key: string): string {
  return createHmac("sha256", key).update(data).digest("base64url");
}

export async function createSession(user: User): Promise<void> {
  const payload: Payload = {
    uid: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_S,
    v: user.sessionVersion ?? 1,
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

/** Conta da sessão e, se for professor, o cadastro dele: uma transação por requisição. */
const loadSession = cache(async (): Promise<{ user: User | null; teacher: Teacher | null } | null> => {
  const p = await readPayload();
  if (!p) return null;
  return withScope(null, async (r) => {
    const found = await r.users.get(p.uid);
    // Senha trocada ou redefinida depois desta sessão: ela não vale mais.
    const user = found && sessionIsCurrent(found, p.v) ? found : null;
    const teacher = user?.role === "teacher" ? await r.teachers.byUserId(user.id) : null;
    return { user, teacher };
  });
});

/** Usuário logado (ou null). Contas bloqueadas contam como deslogadas. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const user = (await loadSession())?.user;
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
  const teacher = (await loadSession())?.teacher;
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
  // Mesma busca restrita de studentForUser (só por user_id), mais o professor
  // e a conta dele (tabelas globais), numa transação só.
  const found = await withScope({ system: true }, async (r) => {
    const student = await r.students.byUserId(user.id);
    const teacher = student ? await r.teachers.get(student.teacherId) : null;
    const teacherUser = teacher ? await r.users.get(teacher.userId) : null;
    return { student, teacher, teacherUser };
  });
  const { student, teacher, teacherUser } = found;
  if (!student || student.status !== "active") redirect("/sair?m=arquivado");
  if (!teacher) redirect("/sair?m=arquivado");
  if (teacherUser?.blocked) redirect("/sair?m=bloqueado");
  return { user, student, teacher, scope: { teacherId: teacher.id, studentId: student.id } };
});

export const requireAdmin = cache(async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (user.role !== "admin") redirect(homeFor(user.role));
  return user;
});

/**
 * Quem está pedindo um arquivo (rota /arquivos/[id]): professor ou aluno
 * ativo, ou null. Não redireciona: a rota responde 404 em qualquer recusa.
 */
export const currentFileViewer = cache(async (): Promise<
  { role: "teacher"; teacherId: string } | { role: "student"; teacherId: string; studentId: string } | null
> => {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "teacher") {
    const teacher = (await loadSession())?.teacher;
    return teacher ? { role: "teacher", teacherId: teacher.id } : null;
  }
  if (user.role === "student") {
    const student = await studentForUser(user.id);
    return student && student.status === "active" ? { role: "student", teacherId: student.teacherId, studentId: student.id } : null;
  }
  return null;
});
