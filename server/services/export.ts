import "server-only";
import { assignments, classes, lessons, students, submissions, teachers } from "@/server/db/repo";
import { describeKey } from "@/lib/question-types";

/** Dados de um aluno em formato legível (LGPD: portabilidade). */
export async function exportStudentData(teacherId: string, studentId: string) {
  const student = await students.get(teacherId, studentId);
  if (!student) return null;
  const [teacher, asgs, subs, ls, cls] = await Promise.all([
    teachers.get(teacherId),
    assignments.all(teacherId),
    submissions.all(teacherId),
    lessons.all(teacherId),
    classes.all(teacherId),
  ]);
  const myClassIds = new Set(cls.filter((c) => c.studentIds.includes(studentId)).map((c) => c.id));
  const { notes: _privateNotes, ...profile } = student;
  void _privateNotes;
  return {
    exportedAt: new Date().toISOString(),
    teacher: teacher?.name,
    profile,
    classes: cls.filter((c) => myClassIds.has(c.id)).map((c) => c.name),
    submissions: subs
      .filter((s) => s.studentId === studentId)
      .map((s) => {
        const a = asgs.find((x) => x.id === s.assignmentId);
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
            expected: s.status === "graded" ? describeKey(q.type, q.content, q.answerKey) : undefined,
          })),
        };
      }),
    lessons: ls
      .filter((l) => l.studentId === studentId || myClassIds.has(l.classId))
      .map((l) => ({ startsAt: l.startsAt, topic: l.topic, notes: l.notes, vocabulary: l.vocabulary, attendance: l.attendance[studentId] ?? null })),
  };
}
