"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { activities, assignments, classes, questions, students, submissions } from "@/server/db/repo";
import { createAssignment } from "@/server/services/assignments";
import { fromInputDateTime, newId, nowIso } from "@/lib/format";
import type { Activity } from "@/lib/types";
import type { FormState } from "./state";

const ActivitySchema = z.object({
  id: z.string().default(""),
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

  const mine = new Set((await questions.all(teacher.id)).map((q) => q.id));
  const items = d.items.filter((i) => mine.has(i.questionId));
  if (items.length === 0) return { error: "Adicione pelo menos uma questão." };

  const existing = d.id ? await activities.get(teacher.id, d.id) : null;
  if (d.id && !existing) return { error: "Atividade não encontrada." };
  const act: Activity = {
    id: existing?.id ?? newId(),
    teacherId: teacher.id,
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
  await activities.put(act);
  revalidatePath("/professor/atividades");
  redirect(`/professor/atividades/${act.id}${existing ? "" : "?nova=1"}`);
}

export async function setActivityArchived(id: string, archived: boolean): Promise<void> {
  const { teacher } = await requireTeacher();
  const a = await activities.get(teacher.id, id);
  if (!a) return;
  await activities.put({ ...a, archived, updatedAt: nowIso() });
  revalidatePath("/professor/atividades");
}

export async function assignActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  const { teacher } = await requireTeacher();
  const activity = await activities.get(teacher.id, String(formData.get("activityId") ?? ""));
  if (!activity) return { error: "Atividade não encontrada." };
  const targets = formData.getAll("targets").map(String);
  if (targets.length === 0) return { error: "Escolha pelo menos um aluno ou turma." };

  const [studs, cls] = await Promise.all([students.all(teacher.id), classes.all(teacher.id)]);
  const active = new Set(studs.filter((s) => s.status === "active").map((s) => s.id));
  const studentIds = new Set<string>();
  let classId = "";
  for (const t of targets) {
    const [kind, id] = t.split(":");
    if (kind === "aluno" && active.has(id)) studentIds.add(id);
    if (kind === "turma") {
      const c = cls.find((x) => x.id === id);
      if (c) {
        c.studentIds.filter((s) => active.has(s)).forEach((s) => studentIds.add(s));
        if (targets.length === 1) classId = c.id;
      }
    }
  }
  if (studentIds.size === 0) return { error: "Nenhum aluno ativo nos destinos escolhidos." };

  const releaseAt = fromInputDateTime(String(formData.get("releaseAt") ?? "")) || nowIso();
  const dueAt = fromInputDateTime(String(formData.get("dueAt") ?? ""));
  if (dueAt && dueAt <= releaseAt) return { error: "O prazo precisa ser depois da liberação." };

  await createAssignment(activity, { studentIds: [...studentIds], classId, releaseAt, dueAt });
  revalidatePath("/professor", "layout");
  return { ok: `Atividade enviada para ${studentIds.size} aluno(s).` };
}

export async function updateAssignmentDue(assignmentId: string, formData: FormData): Promise<void> {
  const { teacher } = await requireTeacher();
  const a = await assignments.get(teacher.id, assignmentId);
  if (!a) return;
  await assignments.put({ ...a, dueAt: fromInputDateTime(String(formData.get("dueAt") ?? "")) });
  revalidatePath(`/professor/atividades/${a.activityId}`);
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const { teacher } = await requireTeacher();
  const a = await assignments.get(teacher.id, assignmentId);
  if (!a) return;
  for (const s of await submissions.all(teacher.id)) {
    if (s.assignmentId === assignmentId) await submissions.remove(teacher.id, s.id);
  }
  await assignments.remove(teacher.id, assignmentId);
  revalidatePath("/professor", "layout");
}
