"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudent } from "@/server/auth/session";
import { withScope } from "@/server/db/repo";
import { deadlineFor, rowFor } from "@/server/services/assignments";
import { cleanResponses, GRACE_MS, loadOwnAttempt, submitAttemptTx, verifiedFileResponses } from "@/server/services/flows";
import { newId, nowIso } from "@/lib/format";

// Todas as ações do aluno rodam no escopo dele: a RLS só deixa ler e gravar
// as tentativas do próprio aluno e os envios atribuídos a ele.

export async function startAttempt(assignmentId: string): Promise<void> {
  const { student, teacher, scope } = await requireStudent();
  const go = await withScope(scope, async (r) => {
    const assignment = await r.assignments.get(assignmentId);
    if (!assignment || !assignment.studentIds.includes(student.id) || new Date(assignment.releaseAt).getTime() > Date.now()) {
      return "/aluno/atividades";
    }
    const row = rowFor(assignment, student.id, await r.submissions.all());
    if (row.current) return `/aluno/atividades/${assignmentId}/fazer`;
    if (row.attemptsLeft <= 0) return `/aluno/atividades/${assignmentId}`;
    await r.submissions.put({
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
    return `/aluno/atividades/${assignmentId}/fazer`;
  }).catch((err: { code?: string }) => {
    // Dois cliques ao mesmo tempo: o índice único deixa só uma tentativa aberta.
    if (err.code === "23505") return `/aluno/atividades/${assignmentId}/fazer`;
    throw err;
  });
  redirect(go);
}

export async function saveDraft(submissionId: string, responses: unknown): Promise<{ ok: boolean; error?: string }> {
  const { student, scope } = await requireStudent();
  return withScope(scope, async (r) => {
    const own = await loadOwnAttempt(r, student.id, submissionId);
    if (!own || own.sub.status !== "in_progress") return { ok: false, error: "Esta tentativa não está mais aberta." };
    const deadline = deadlineFor(own.assignment, own.sub);
    if (deadline && Date.now() > deadline + GRACE_MS) return { ok: false, error: "O tempo acabou." };
    await r.submissions.put({ ...own.sub, responses: await verifiedFileResponses(r, own.assignment, own.sub, cleanResponses(own.assignment, responses)) });
    return { ok: true };
  });
}

/** Entrega: correção e notificação ao professor na mesma transação. */
export async function submitAttempt(submissionId: string, responses: unknown): Promise<{ error?: string }> {
  const { student, teacher, scope } = await requireStudent();
  const result = await withScope(scope, (r) =>
    submitAttemptTx(r, { studentId: student.id, studentName: student.name, teacherUserId: teacher.userId, submissionId, responses })
  );
  if ("error" in result) return { error: result.error };
  revalidatePath("/aluno", "layout");
  revalidatePath("/professor", "layout");
  redirect(`/aluno/atividades/${result.assignment.id}/resultado?e=${result.submission.id}`);
}
