import "server-only";
import type { Repo } from "@/server/db/repo";
import { DEFAULT_TEMPLATE } from "@/lib/subjects";
import { newId, nowIso } from "@/lib/format";
import type { Teacher, User } from "@/lib/types";

/**
 * Cria a conta de login do professor, o cadastro de professor e a primeira
 * disciplina (Inglês, a partir do modelo). Use dentro de uma transação cujo
 * escopo seja o do novo professor (ou system).
 */
export async function createTeacherAccount(
  r: Repo,
  data: {
    teacherId?: string;
    name: string;
    email: string;
    passwordHash: string;
    slug: string;
    bio?: string;
    color?: string;
    /** Dados de demonstração já nascem com o e-mail confirmado. */
    emailVerified?: boolean;
  }
): Promise<{ user: User; teacher: Teacher }> {
  const user: User = {
    id: newId(),
    email: data.email.toLowerCase(),
    passwordHash: data.passwordHash,
    role: "teacher",
    name: data.name,
    blocked: false,
    createdAt: nowIso(),
    emailVerifiedAt: data.emailVerified ? nowIso() : "",
    sessionVersion: 1,
  };
  await r.users.create(user);
  const teacher = await r.teachers.save({
    id: data.teacherId ?? newId(),
    userId: user.id,
    name: data.name,
    slug: data.slug,
    bio: data.bio ?? "",
    color: data.color ?? "#378ADD",
    createdAt: nowIso(),
  });
  await r.subjects.createFromTemplate(teacher.id, DEFAULT_TEMPLATE);
  return { user, teacher };
}
