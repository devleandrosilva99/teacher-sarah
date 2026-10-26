import "server-only";
import { withScope, type Scope } from "@/server/db/repo";
import { describeKey } from "@/lib/question-types";
import { canSeeAnswers, rowFor } from "./assignments";

/**
 * Dados de um aluno em formato legível (LGPD: portabilidade), lidos numa
 * transação só. O professor exporta com o escopo dele; o aluno, com o próprio
 * escopo (a RLS limita o que ele enxerga).
 */
export async function exportStudentData(scope: Exclude<Scope, null>, teacherId: string, studentId: string) {
  return withScope(scope, async (r) => {
  const student = await r.students.get(studentId);
  if (!student || student.teacherId !== teacherId) return null;
  const teacher = await r.teachers.get(teacherId);
  const asgs = await r.assignments.all();
  const subs = await r.submissions.all();
  const ls = await r.lessons.all();
  const cls = await r.classes.all();
  const subjectList = await r.subjects.all();
  const files = (await r.files.forStudent(studentId)).filter((f) => f.status === "ready");
  // No escopo do aluno a RLS já só devolve as aulas dele (e ele não lê turmas).
  const asStudent = typeof scope === "object" && "studentId" in scope && !!scope.studentId;
  const myClassIds = new Set(cls.filter((c) => c.studentIds.includes(studentId)).map((c) => c.id));
  const subjectName = new Map(subjectList.map((x) => [x.id, x.name]));
  const { notes: _privateNotes, levels, ...rest } = student;
  void _privateNotes;
  const profile = { ...rest, levels: Object.fromEntries(Object.entries(levels).map(([id, lv]) => [subjectName.get(id) ?? id, lv])) };
  return {
    exportedAt: new Date().toISOString(),
    teacher: teacher?.name,
    profile,
    classes: cls.filter((c) => myClassIds.has(c.id)).map((c) => c.name),
    submissions: subs
      .filter((s) => s.studentId === studentId)
      .map((s) => {
        const a = asgs.find((x) => x.id === s.assignmentId);
        // O aluno só recebe o gabarito quando a regra da atividade permite.
        const showKey = !!a && s.status === "graded" && (!asStudent || canSeeAnswers(rowFor(a, studentId, subs)));
        return {
          activity: a?.title,
          attempt: s.attempt,
          startedAt: s.startedAt,
          submittedAt: s.submittedAt,
          status: s.status,
          score: s.score,
          maxScore: s.maxScore,
          feedback: s.generalFeedback,
          answers: (a?.questions ?? []).map((q) => ({
            question: q.prompt,
            response: s.answers[q.id]?.response ?? s.responses[q.id] ?? null,
            score: s.answers[q.id]?.score ?? null,
            maxScore: q.activityPoints,
            feedback: s.answers[q.id]?.feedback ?? "",
            expected: showKey ? describeKey(q.type, q.content, q.answerKey) : undefined,
          })),
        };
      }),
    // Arquivos enviados pelo aluno: metadados e o endereço para baixar (com login).
    files: files.map((f) => ({
      name: f.originalName,
      type: f.contentType,
      sizeBytes: f.sizeBytes,
      uploadedAt: f.createdAt,
      activity: asgs.find((a) => subs.some((s) => s.id === f.submissionId && s.assignmentId === a.id))?.title ?? null,
      download: `/arquivos/${f.id}`,
    })),
    lessons: ls
      .filter((l) => asStudent || l.studentId === studentId || myClassIds.has(l.classId))
      .map((l) => ({ startsAt: l.startsAt, topic: l.topic, notes: l.notes, vocabulary: l.vocabulary, attendance: l.attendance[studentId] ?? null })),
  };
  });
}
