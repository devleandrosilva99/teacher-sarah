"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudent } from "@/server/auth/session";
import { assignments, submissions } from "@/server/db/repo";
import { deadlineFor, gradeSubmission, rowFor } from "@/server/services/assignments";
import { notify } from "@/server/services/notify";
import { newId, nowIso } from "@/lib/format";
import type { Assignment, Submission } from "@/lib/types";

const GRACE_MS = 60_000;
const MAX_RESPONSE_BYTES = 200_000;

async function loadOwn(submissionId: string): Promise<{ sub: Submission; assignment: Assignment; teacherUserId: string; studentName: string } | null> {
  const { student, teacher } = await requireStudent();
  const sub = await submissions.get(teacher.id, submissionId);
  if (!sub || sub.studentId !== student.id) return null;
  const assignment = await assignments.get(teacher.id, sub.assignmentId);
  if (!assignment || !assignment.studentIds.includes(student.id)) return null;
  return { sub, assignment, teacherUserId: teacher.userId, studentName: student.name };
}

function cleanResponses(assignment: Assignment, raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  if (JSON.stringify(raw).length > MAX_RESPONSE_BYTES) return {};
  const allowed = new Set(assignment.questions.map((q) => q.id));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (allowed.has(k) && v && typeof v === "object") out[k] = v;
  }
  return out;
}

export async function startAttempt(assignmentId: string): Promise<void> {
  const { student, teacher } = await requireStudent();
  const assignment = await assignments.get(teacher.id, assignmentId);
  if (!assignment || !assignment.studentIds.includes(student.id) || new Date(assignment.releaseAt).getTime() > Date.now()) {
    redirect("/aluno/atividades");
  }
  const subs = await submissions.all(teacher.id);
  const row = rowFor(assignment, student.id, subs);
  if (row.current) redirect(`/aluno/atividades/${assignmentId}/fazer`);
  if (row.attemptsLeft <= 0) redirect(`/aluno/atividades/${assignmentId}`);
  await submissions.put({
    id: newId(),
    teacherId: teacher.id,
    assignmentId,
    studentId: student.id,
    attempt: row.attempts.length + 1,
    startedAt: nowIso(),
    submittedAt: "",
    late: false,
    status: "in_progress",
    responses: {},
    answers: {},
    score: 0,
    maxScore: 0,
    generalFeedback: "",
  });
  redirect(`/aluno/atividades/${assignmentId}/fazer`);
}

export async function saveDraft(submissionId: string, responses: unknown): Promise<{ ok: boolean; error?: string }> {
  const own = await loadOwn(submissionId);
  if (!own || own.sub.status !== "in_progress") return { ok: false, error: "Esta tentativa não está mais aberta." };
  const deadline = deadlineFor(own.assignment, own.sub);
  if (deadline && Date.now() > deadline + GRACE_MS) return { ok: false, error: "O tempo acabou." };
  await submissions.put({ ...own.sub, responses: cleanResponses(own.assignment, responses) });
  return { ok: true };
}

export async function submitAttempt(submissionId: string, responses: unknown): Promise<{ error?: string }> {
  const own = await loadOwn(submissionId);
  if (!own) return { error: "Tentativa não encontrada." };
  const { sub, assignment } = own;
  if (sub.status !== "in_progress") redirect(`/aluno/atividades/${assignment.id}/resultado?e=${sub.id}`);

  const deadline = deadlineFor(assignment, sub);
  const inTime = !deadline || Date.now() <= deadline + GRACE_MS;
  // Depois do tempo limite, vale o último rascunho salvo dentro do prazo.
  const finalResponses = inTime ? cleanResponses(assignment, responses) : sub.responses;
  const graded = gradeSubmission(assignment, {
    ...sub,
    responses: finalResponses,
    submittedAt: nowIso(),
    late: !!assignment.dueAt && Date.now() > new Date(assignment.dueAt).getTime(),
    status: "submitted",
  });
  await submissions.put(graded);
  await notify(
    own.teacherUserId,
    graded.status === "submitted"
      ? `${own.studentName} entregou "${assignment.title}" (tem resposta para corrigir).`
      : `${own.studentName} entregou "${assignment.title}".`,
    `/professor/correcao/${graded.id}`
  );
  revalidatePath("/aluno", "layout");
  revalidatePath("/professor", "layout");
  redirect(`/aluno/atividades/${assignment.id}/resultado?e=${graded.id}`);
}
