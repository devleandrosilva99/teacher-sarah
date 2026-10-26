"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireStudent, requireTeacher } from "@/server/auth/session";
import { notifications, withScope } from "@/server/db/repo";
import { notify } from "@/server/services/notify";
import { nowIso, slugify } from "@/lib/format";
import type { FormState } from "./state";

export async function saveTeacherSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, teacher } = await requireTeacher();
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Informe seu nome.").max(80),
      slug: z.string().trim().min(3, "O endereço precisa ter pelo menos 3 caracteres.").max(40),
      bio: z.string().trim().max(300).default(""),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const slug = slugify(d.slug);
  if (slug.length < 3) return { error: "Use letras e números no endereço." };
  const reserved = ["admin", "professor", "aluno", "entrar", "cadastro", "api"];
  return withScope(teacher.id, async (r) => {
    const owner = await r.teachers.bySlug(slug);
    if (reserved.includes(slug) || (owner && owner.id !== teacher.id)) return { error: "Este endereço já está em uso." };
    await r.teachers.save({ ...teacher, name: d.name, slug, bio: d.bio, color: d.color });
    if (user.name !== d.name) await r.users.put({ ...user, name: d.name });
    revalidatePath("/professor", "layout");
    return { ok: "Configurações salvas." };
  });
}

export async function markAllRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await notifications.markAllRead(user.id);
  revalidatePath("/", "layout");
}

export async function updateStudentContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const { student, scope } = await requireStudent();
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30);
  // Escopo do aluno: a RLS só deixa atualizar o próprio cadastro.
  await withScope(scope, (r) => r.students.updateSelf(student.id, { phone }));
  return { ok: "Dados atualizados." };
}

export async function requestDeletion(): Promise<void> {
  const { student, teacher, scope } = await requireStudent();
  if (student.deletionRequestedAt) return;
  await withScope(scope, async (r) => {
    await r.students.updateSelf(student.id, { deletionRequestedAt: nowIso() });
    await notify(r, teacher.userId, `${student.name} pediu a exclusão dos próprios dados.`, `/professor/alunos/${student.id}`);
  });
  revalidatePath("/aluno/perfil");
}
