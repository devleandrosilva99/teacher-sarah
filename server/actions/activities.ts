"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { isUuid, withScope } from "@/server/db/repo";
import { createAssignment, resolveTargets } from "@/server/services/assignments";
import { fromInputDateTime, newId, nowIso } from "@/lib/format";
import type { Activity } from "@/lib/types";
import type { FormState } from "./state";

const ActivitySchema = z.object({
  id: z.string().default(""),
  subjectId: z.string().default(""),
  title: z.string().trim().min(2, "Dê um título à atividade.").max(150),
  instructions: z.string().trim().max(2000).default(""),
  items: z
    .array(z.object({ questionId: z.string(), points: z.coerce.number().min(0.5).max(100) }))
    .min(1, "Adicione pelo menos uma questão.")
    .max(100, "Use no máximo 100 questões."),
  timeLimitMin: z.coerce.number().int().min(0).max(600).default(0),
  maxAttempts: z.coerce.number().int().min(1).max(10).default(1),
  shuffle: z.boolean().default(false),
  showAnswers: z.enum(["after_submit", "after_due", "never"]),
});

export async function saveActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  const { teacher } = await requireTeacher();
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Não foi possível ler a atividade." };
  }
  const parsed = ActivitySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const result = await withScope(teacher.id, async (r) => {
    const existing = d.id ? await r.activities.get(d.id) : null;
    if (d.id && !existing) return { error: "Atividade não encontrada." };
    // A disciplina é definida na criação: as questões precisam ser dela.
    const subject = await r.subjects.get(existing?.subjectId ?? d.subjectId);
    if (!subject) return { error: "Escolha a disciplina." };
    const ofSubject = new Set((await r.questions.all()).filter((q) => q.subjectId === subject.id).map((q) => q.id));
    const items = d.items.filter((i) => ofSubject.has(i.questionId));
    if (items.length === 0) return { error: "Adicione pelo menos uma questão desta disciplina." };
    const act: Activity = {
      id: existing?.id ?? newId(),
      teacherId: teacher.id,
      subjectId: subject.id,
      title: d.title,
      instructions: d.instructions,
      items,
      timeLimitMin: d.timeLimitMin,
      maxAttempts: d.maxAttempts,
      shuffle: d.shuffle,
      showAnswers: d.showAnswers,
      archived: existing?.archived ?? false,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    await r.activities.put(act);
    return { act, created: !existing };
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/professor/atividades");
  redirect(`/professor/atividades/${result.act.id}${result.created ? "?nova=1" : ""}`);
}

export async function setActivityArchived(id: string, archived: boolean): Promise<void> {
  const { teacher } = await requireTeacher();
  await withScope(teacher.id, async (r) => {
    const a = await r.activities.get(id);
    if (a) await r.activities.put({ ...a, archived, updatedAt: nowIso() });
  });
  revalidatePath("/professor/atividades");
}

export async function assignActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  const { teacher } = await requireTeacher();
  const targets = formData.getAll("targets").map(String);
  if (targets.length === 0) return { error: "Escolha pelo menos um aluno ou turma." };
  const releaseAt = fromInputDateTime(String(formData.get("releaseAt") ?? "")) || nowIso();
  const dueAt = fromInputDateTime(String(formData.get("dueAt") ?? ""));
  if (dueAt && dueAt <= releaseAt) return { error: "O prazo precisa ser depois da liberação." };

  // Envio, ligação com os alunos e notificações: tudo ou nada.
  const result = await withScope(teacher.id, async (r) => {
    const activity = await r.activities.get(String(formData.get("activityId") ?? ""));
    if (!activity) return { error: "Atividade não encontrada." };
    const { studentIds, classId } = await resolveTargets(r, targets);
    if (studentIds.size === 0) return { error: "Nenhum aluno ativo nos destinos escolhidos." };
    await createAssignment(r, activity, { studentIds: [...studentIds], classId, releaseAt, dueAt });
    return { count: studentIds.size };
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/professor", "layout");
  return { ok: `Atividade enviada para ${result.count} aluno(s). Para avisar pelo WhatsApp, use os botões no envio logo abaixo.` };
}

export async function updateAssignmentDue(assignmentId: string, formData: FormData): Promise<void> {
  const { teacher } = await requireTeacher();
  const a = await withScope(teacher.id, async (r) => {
    const found = await r.assignments.get(assignmentId);
    if (!found) return null;
    const dueAt = fromInputDateTime(String(formData.get("dueAt") ?? ""));
    if (dueAt && dueAt <= found.releaseAt) return found; // prazo inválido: mantém o atual
    await r.assignments.setDue(found.id, dueAt);
    return found;
  });
  if (a) revalidatePath(`/professor/atividades/${a.activityId}`);
}

/** Cancela um envio: o envio e as tentativas dele saem juntos (ON DELETE CASCADE). */
export async function deleteAssignment(assignmentId: string): Promise<void> {
  const { teacher } = await requireTeacher();
  if (!isUuid(assignmentId)) return;
  await withScope(teacher.id, (r) => r.assignments.remove(assignmentId));
  revalidatePath("/professor", "layout");
}
