"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireStudent, requireTeacher } from "@/server/auth/session";
import { notifications, students, teachers, users } from "@/server/db/repo";
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
  const owner = await teachers.bySlug(slug);
  if (reserved.includes(slug) || (owner && owner.id !== teacher.id)) return { error: "Este endereço já está em uso." };
  await teachers.save({ ...teacher, name: d.name, slug, bio: d.bio, color: d.color }, teacher.slug);
  if (user.name !== d.name) await users.put({ ...user, name: d.name });
  revalidatePath("/professor", "layout");
  return { ok: "Configurações salvas." };
}

export async function markAllRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  for (const n of await notifications.list(user.id)) {
    if (!n.readAt) await notifications.put({ ...n, readAt: nowIso() });
  }
  revalidatePath("/", "layout");
}

export async function updateStudentContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const { student } = await requireStudent();
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 30);
  await students.put({ ...student, phone });
  return { ok: "Dados atualizados." };
}

export async function requestDeletion(): Promise<void> {
  const { student, teacher } = await requireStudent();
  if (student.deletionRequestedAt) return;
  await students.put({ ...student, deletionRequestedAt: nowIso() });
  await notify(teacher.userId, `${student.name} pediu a exclusão dos próprios dados.`, `/professor/alunos/${student.id}`);
  revalidatePath("/aluno/perfil");
}
