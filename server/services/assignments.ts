import "server-only";
import { activities, assignments, submissions, type Repo, type Scope } from "@/server/db/repo";
import { grade, seededShuffle, shuffleContent } from "@/lib/question-types";
import { newId, nowIso, percent } from "@/lib/format";
import { notify } from "./notify";
import type {
  Activity,
  AnswerRecord,
  Assignment,
  Passage,
  PublicQuestion,
  SnapshotQuestion,
  Skill,
  Submission,
} from "@/lib/types";

/**
 * Envia uma atividade: grava o envio com a cópia congelada das questões,
 * liga os alunos e notifica cada um, tudo na transação de `r`.
 */
export async function createAssignment(
  r: Repo,
  activity: Activity,
  target: { studentIds: string[]; classId: string; releaseAt: string; dueAt: string }
): Promise<Assignment> {
  const [all, subject, passageList, studentList] = await Promise.all([
    r.questions.all(),
    r.subjects.get(activity.subjectId),
    r.passages.all(),
    r.students.all(),
  ]);
  const byId = new Map(all.map((q) => [q.id, q]));
  const skillLabel = new Map((subject?.skills ?? []).map((k) => [k.key, k.label]));
  const snap: SnapshotQuestion[] = [];
  for (const item of activity.items) {
    const q = byId.get(item.questionId);
    if (q) snap.push({ ...q, activityPoints: item.points, skillLabel: skillLabel.get(q.skill) ?? q.skill });
  }
  const passageIds = new Set(snap.map((q) => q.passageId).filter(Boolean));
  const usedPassages: Passage[] = passageList.filter((p) => passageIds.has(p.id));

  const assignment: Assignment = {
    id: newId(),
    teacherId: activity.teacherId,
    activityId: activity.id,
    subjectId: activity.subjectId,
    title: activity.title,
    instructions: activity.instructions,
    studentIds: Array.from(new Set(target.studentIds)),
    classId: target.classId,
    releaseAt: target.releaseAt || nowIso(),
    dueAt: target.dueAt,
    timeLimitMin: activity.timeLimitMin,
    maxAttempts: activity.maxAttempts,
    shuffle: activity.shuffle,
    showAnswers: activity.showAnswers,
    questions: snap,
    passages: usedPassages,
    createdAt: nowIso(),
  };
  await r.assignments.create(assignment);

  for (const st of studentList) {
    if (assignment.studentIds.includes(st.id)) {
      await notify(r, st.userId, `Nova atividade: ${assignment.title}`, `/aluno/atividades/${assignment.id}`);
    }
  }
  return assignment;
}

/**
 * Transforma os destinos escolhidos ("aluno:<id>", "turma:<id>") em alunos
 * ativos. Turma arquivada não recebe envios novos.
 */
export async function resolveTargets(r: Repo, targets: string[]): Promise<{ studentIds: Set<string>; classId: string }> {
  const [studs, cls] = [await r.students.all(), await r.classes.all()];
  const active = new Set(studs.filter((x) => x.status === "active").map((x) => x.id));
  const studentIds = new Set<string>();
  let classId = "";
  for (const t of targets) {
    const [kind, id] = t.split(":");
    if (kind === "aluno" && active.has(id)) studentIds.add(id);
    if (kind === "turma") {
      const c = cls.find((x) => x.id === id && !x.archivedAt);
      if (c) {
        c.studentIds.filter((x) => active.has(x)).forEach((x) => studentIds.add(x));
        if (targets.length === 1) classId = c.id;
      }
    }
  }
  return { studentIds, classId };
}

/** Questões como o aluno as vê nesta tentativa (sem gabarito). */
export function publicQuestionsFor(assignment: Assignment, submissionId: string): PublicQuestion[] {
  let list = assignment.questions;
  if (assignment.shuffle) {
    // Embaralha mantendo juntas as questões de um mesmo texto de leitura.
    const groups: SnapshotQuestion[][] = [];
    for (const q of list) {
      const last = groups[groups.length - 1];
      if (last && q.passageId && last[0].passageId === q.passageId) last.push(q);
      else groups.push([q]);
    }
    list = seededShuffle(groups, submissionId).flat();
  }
  return list.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    instructions: q.instructions,
    mediaUrl: q.mediaUrl,
    passageId: q.passageId,
    points: q.activityPoints,
    content: assignment.shuffle ? shuffleContent(q.type, q.content, submissionId + q.id) : q.content,
  }));
}

export function deadlineFor(assignment: Assignment, submission: Submission): number | null {
  if (!assignment.timeLimitMin) return null;
  return new Date(submission.startedAt).getTime() + assignment.timeLimitMin * 60_000;
}

/** Corrige as respostas de uma entrega, preservando correções manuais já feitas. */
export function gradeSubmission(assignment: Assignment, sub: Submission): Submission {
  const answers: Record<string, AnswerRecord> = {};
  let needsManual = false;
  for (const q of assignment.questions) {
    const response = sub.responses[q.id] ?? {};
    const previous = sub.answers[q.id];
    const r = grade(q.type, q.content, q.answerKey, response, q.activityPoints);
    if (previous && !previous.auto && previous.score !== null) {
      answers[q.id] = { ...previous, response };
      continue;
    }
    if (r.needsManual) needsManual = true;
    answers[q.id] = {
      response,
      score: r.score,
      maxScore: q.activityPoints,
      correct: r.correct,
      auto: !r.needsManual,
      feedback: previous?.feedback ?? "",
      detail: r.detail,
    };
  }
  return withTotals({ ...sub, answers, status: needsManual ? "submitted" : "graded" });
}

export function withTotals(sub: Submission): Submission {
  const list = Object.values(sub.answers);
  const score = Math.round(list.reduce((a, x) => a + (x.score ?? 0), 0) * 100) / 100;
  const maxScore = list.reduce((a, x) => a + x.maxScore, 0);
  const pending = list.some((x) => x.score === null);
  return { ...sub, score, maxScore, status: sub.status === "in_progress" ? "in_progress" : pending ? "submitted" : "graded" };
}

export type StudentAssignmentStatus = "not_started" | "in_progress" | "submitted" | "graded" | "overdue";

export interface StudentAssignmentRow {
  assignment: Assignment;
  attempts: Submission[];
  current: Submission | null;
  best: Submission | null;
  status: StudentAssignmentStatus;
  attemptsLeft: number;
  percent: number | null;
}

export function rowFor(assignment: Assignment, studentId: string, subs: Submission[]): StudentAssignmentRow {
  const attempts = subs
    .filter((s) => s.assignmentId === assignment.id && s.studentId === studentId)
    .sort((a, b) => a.attempt - b.attempt);
  const current = attempts.find((s) => s.status === "in_progress") ?? null;
  const done = attempts.filter((s) => s.status !== "in_progress");
  const graded = done.filter((s) => s.status === "graded");
  const best =
    [...graded].sort((a, b) => percent(b.score, b.maxScore) - percent(a.score, a.maxScore))[0] ??
    done[done.length - 1] ??
    null;
  const overdue = !!assignment.dueAt && new Date(assignment.dueAt).getTime() < Date.now();
  let status: StudentAssignmentStatus = "not_started";
  if (current) status = "in_progress";
  else if (best?.status === "graded") status = "graded";
  else if (best?.status === "submitted") status = "submitted";
  else if (overdue) status = "overdue";
  return {
    assignment,
    attempts,
    current,
    best,
    status,
    attemptsLeft: Math.max(0, assignment.maxAttempts - attempts.length),
    percent: best && best.status === "graded" ? percent(best.score, best.maxScore) : null,
  };
}

/** Envios liberados para o aluno. Nas telas do aluno, passe o escopo dele. */
export async function studentRows(scope: Exclude<Scope, null>, studentId: string): Promise<StudentAssignmentRow[]> {
  const [all, subs] = await Promise.all([assignments.all(scope), submissions.all(scope)]);
  const now = Date.now();
  return all
    .filter((a) => a.studentIds.includes(studentId) && new Date(a.releaseAt).getTime() <= now)
    .map((a) => rowFor(a, studentId, subs))
    .sort((a, b) => b.assignment.createdAt.localeCompare(a.assignment.createdAt));
}

export interface ProgressSummary {
  average: number | null;
  completed: number;
  total: number;
  pending: number;
  overdue: number;
  bySkill: { skill: Skill; label: string; percent: number; answered: number }[];
  history: { date: string; title: string; percent: number }[];
}

export function summarize(rows: StudentAssignmentRow[]): ProgressSummary {
  const graded = rows.filter((r) => r.percent !== null);
  const skill = new Map<Skill, { label: string; s: number; m: number; n: number }>();
  for (const r of graded) {
    const sub = r.best!;
    for (const q of r.assignment.questions) {
      const a = sub.answers[q.id];
      if (!a || a.score === null) continue;
      const cur = skill.get(q.skill) ?? { label: q.skillLabel ?? q.skill, s: 0, m: 0, n: 0 };
      cur.s += a.score;
      cur.m += a.maxScore;
      cur.n += 1;
      skill.set(q.skill, cur);
    }
  }
  return {
    average: graded.length ? Math.round(graded.reduce((a, r) => a + (r.percent ?? 0), 0) / graded.length) : null,
    completed: rows.filter((r) => r.status === "graded" || r.status === "submitted").length,
    total: rows.length,
    pending: rows.filter((r) => r.status === "not_started" || r.status === "in_progress").length,
    overdue: rows.filter((r) => r.status === "overdue").length,
    bySkill: [...skill.entries()].map(([k, v]) => ({ skill: k, label: v.label, percent: percent(v.s, v.m), answered: v.n })),
    history: graded
      .map((r) => ({ date: r.best!.submittedAt, title: r.assignment.title, percent: r.percent! }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/**
 * O aluno vê o gabarito conforme a configuração da atividade. Com mais de uma
 * tentativa, só depois de esgotá-las (ou do prazo), para não virar cola.
 */
export function canSeeAnswers(row: StudentAssignmentRow): boolean {
  const a = row.assignment;
  const duePassed = !!a.dueAt && new Date(a.dueAt).getTime() < Date.now();
  if (a.showAnswers === "never") return false;
  if (a.showAnswers === "after_due") return a.dueAt ? duePassed : row.attemptsLeft === 0;
  return row.attemptsLeft === 0 || duePassed;
}

export async function activityById(teacherId: string, id: string) {
  return activities.get(teacherId, id);
}
