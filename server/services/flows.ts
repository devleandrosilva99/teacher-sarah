import "server-only";
import type { Repo } from "@/server/db/repo";
import { deadlineFor, gradeSubmission, withTotals } from "./assignments";
import { notify } from "./notify";
import { nowIso } from "@/lib/format";
import type { Assignment, Submission } from "@/lib/types";
import type { Contents } from "@/lib/question-types";

// Operações que alteram várias tabelas. Cada função recebe o repositório de
// uma transação já aberta (withScope): ou tudo é gravado, ou nada.

export const GRACE_MS = 60_000;
const MAX_RESPONSE_BYTES = 200_000;

/** Lê e trava a tentativa do aluno (FOR UPDATE) junto com o envio. */
export async function loadOwnAttempt(r: Repo, studentId: string, submissionId: string): Promise<{ sub: Submission; assignment: Assignment } | null> {
  const sub = await r.submissions.getForUpdate(submissionId);
  if (!sub || sub.studentId !== studentId) return null;
  const assignment = await r.assignments.get(sub.assignmentId);
  if (!assignment || !assignment.studentIds.includes(studentId)) return null;
  return { sub, assignment };
}

export function cleanResponses(assignment: Assignment, raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  if (JSON.stringify(raw).length > MAX_RESPONSE_BYTES) return {};
  const allowed = new Set(assignment.questions.map((q) => q.id));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (allowed.has(k) && v && typeof v === "object") out[k] = v;
  }
  return out;
}

/**
 * Nas respostas de entrega de arquivo, mantém só arquivos prontos do próprio
 * aluno, desta tentativa e desta questão, até o limite da questão.
 */
export async function verifiedFileResponses(r: Repo, assignment: Assignment, sub: Submission, responses: Record<string, unknown>) {
  const questions = assignment.questions.filter((q) => q.type === "file_upload");
  if (!questions.length) return responses;
  const mine = await r.files.forSubmission(sub.id);
  const out = { ...responses };
  for (const q of questions) {
    const wanted = (responses[q.id] as { fileIds?: unknown } | undefined)?.fileIds;
    const allowed = new Set(mine.filter((f) => f.questionId === q.id && f.studentId === sub.studentId).map((f) => f.id));
    const max = (q.content as Contents["file_upload"]).maxFiles;
    const ids = Array.isArray(wanted) ? [...new Set(wanted.map(String))].filter((id) => allowed.has(id)).slice(0, max) : [];
    if (ids.length) out[q.id] = { fileIds: ids };
    else delete out[q.id];
  }
  return out;
}

/** Entrega: corrige, grava e avisa o professor. */
export async function submitAttemptTx(
  r: Repo,
  p: { studentId: string; studentName: string; teacherUserId: string; submissionId: string; responses: unknown }
): Promise<{ error: string } | { submission: Submission; assignment: Assignment; already: boolean }> {
  const own = await loadOwnAttempt(r, p.studentId, p.submissionId);
  if (!own) return { error: "Tentativa não encontrada." };
  const { sub, assignment } = own;
  if (sub.status !== "in_progress") return { submission: sub, assignment, already: true };

  const deadline = deadlineFor(assignment, sub);
  const inTime = !deadline || Date.now() <= deadline + GRACE_MS;
  // Depois do tempo limite, vale o último rascunho salvo dentro do prazo.
  const finalResponses = await verifiedFileResponses(r, assignment, sub, inTime ? cleanResponses(assignment, p.responses) : sub.responses);
  const graded = gradeSubmission(assignment, {
    ...sub,
    responses: finalResponses,
    submittedAt: nowIso(),
    late: !!assignment.dueAt && Date.now() > new Date(assignment.dueAt).getTime(),
    status: "submitted",
  });
  await r.submissions.put(graded);
  await notify(
    r,
    p.teacherUserId,
    graded.status === "submitted"
      ? `${p.studentName} entregou "${assignment.title}" (tem resposta para corrigir).`
      : `${p.studentName} entregou "${assignment.title}".`,
    `/professor/correcao/${graded.id}`
  );
  return { submission: graded, assignment, already: false };
}

export interface GradeInput {
  scores: Record<string, string>; // questionId → nota digitada ("" = manter)
  feedback: Record<string, string>;
  general: string;
}

/** Correção do professor: notas, comentários e aviso ao aluno. */
export async function gradeAttemptTx(r: Repo, submissionId: string, input: GradeInput): Promise<Submission | null> {
  const sub = await r.submissions.getForUpdate(submissionId);
  if (!sub || sub.status === "in_progress") return null;
  const assignment = await r.assignments.get(sub.assignmentId);
  if (!assignment) return null;

  const answers = { ...sub.answers };
  for (const q of assignment.questions) {
    const a = answers[q.id];
    if (!a) continue;
    const rawScore = String(input.scores[q.id] ?? "").replace(",", ".").trim();
    const feedback = String(input.feedback[q.id] ?? "").trim().slice(0, 2000);
    let score = a.score;
    let auto = a.auto;
    if (rawScore !== "") {
      const n = Math.max(0, Math.min(a.maxScore, Number(rawScore)));
      if (!Number.isNaN(n) && n !== a.score) {
        score = Math.round(n * 100) / 100;
        auto = false;
      }
    }
    answers[q.id] = { ...a, score, auto, feedback, correct: score === null ? null : score >= a.maxScore };
  }
  const before = sub.status;
  const updated = withTotals({ ...sub, answers, generalFeedback: input.general.trim().slice(0, 4000) });
  await r.submissions.put(updated);

  if (before !== "graded" && updated.status === "graded") {
    const st = await r.students.get(sub.studentId);
    await notify(r, st?.userId, `Sua atividade "${assignment.title}" foi corrigida.`, `/aluno/atividades/${assignment.id}/resultado?e=${sub.id}`);
  }
  return updated;
}

/**
 * Exclusão definitiva de um aluno (LGPD). Entregas, arquivos (metadados),
 * aulas individuais, convites, níveis e participação em turmas e envios saem
 * por ON DELETE CASCADE; a conta de login é apagada em seguida.
 */
export async function deleteStudentTx(r: Repo, studentId: string): Promise<{ storageKeys: string[] } | null> {
  const st = await r.students.get(studentId);
  if (!st) return null;
  // Os metadados dos arquivos saem por cascata; os objetos, o chamador apaga
  // do armazenamento depois que esta transação confirmar.
  const storageKeys = (await r.files.forStudent(studentId)).map((f) => f.storageKey);
  await r.students.remove(studentId);
  if (st.userId) {
    const u = await r.users.get(st.userId);
    if (u && u.role === "student") await r.users.delete(u);
  }
  return { storageKeys };
}

/**
 * Exclusão definitiva de uma turma, só se nenhuma aula dela foi realizada
 * (senão, o professor deve arquivar). As aulas agendadas que forem apagadas
 * avisam os alunos como um cancelamento normal. A FK RESTRICT da migração 0002
 * impede, no próprio banco, apagar uma turma que ainda tenha aulas.
 */
export async function deleteClassTx(r: Repo, classId: string): Promise<{ ok: true } | { error: "not_found" | "has_done_lessons" }> {
  const group = await r.classes.get(classId);
  if (!group) return { error: "not_found" };
  if ((await r.classes.doneLessonCount(classId)) > 0) return { error: "has_done_lessons" };
  const lessons = (await r.lessons.all()).filter((l) => l.classId === classId);
  const members = (await r.students.all()).filter((s) => group.studentIds.includes(s.id));
  const { formatWeekdayTime } = await import("@/lib/format");
  for (const l of lessons) {
    if (l.status === "scheduled" && new Date(l.startsAt).getTime() > Date.now()) {
      for (const s of members) await notify(r, s.userId, `Aula de ${formatWeekdayTime(l.startsAt)} cancelada.`, "/aluno/agenda");
    }
    await r.lessons.remove(l.id);
  }
  await r.classes.remove(classId);
  return { ok: true };
}
