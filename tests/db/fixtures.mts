// Dois professores (A e B), cada um com disciplina, aluno com login, texto,
// questão e atividade; A envia a atividade para o aluno dele.
import { withScope } from "../../server/db/repo.ts";
import { createTeacherAccount } from "../../server/services/accounts.ts";
import { createAssignment } from "../../server/services/assignments.ts";
import { buildQuestion } from "../../lib/question-types.ts";
import { newId, nowIso } from "../../lib/format.ts";
import type { Activity, Assignment, Passage, Question, Student, Subject, Teacher, User } from "../../lib/types.ts";

export interface TeacherFixture {
  teacher: Teacher;
  teacherUser: User;
  subject: Subject;
  student: Student;
  studentUser: User;
  passage: Passage;
  question: Question;
  openQuestion: Question;
  activity: Activity;
}

export async function makeTeacher(tag: string): Promise<TeacherFixture> {
  const teacherId = newId();
  return withScope(teacherId, async (r) => {
    const { user, teacher } = await createTeacherAccount(r, {
      teacherId,
      name: `Prof ${tag}`,
      email: `prof-${tag}-${teacherId.slice(0, 6)}@teste.local`,
      passwordHash: "x",
      slug: `prof-${tag}-${teacherId.slice(0, 6)}`,
    });
    const subject = (await r.subjects.all())[0];
    const studentUser: User = {
      id: newId(),
      email: `aluno-${tag}-${teacherId.slice(0, 6)}@teste.local`,
      passwordHash: "x",
      role: "student",
      name: `Aluno ${tag}`,
      blocked: false,
      createdAt: nowIso(),
    };
    await r.users.create(studentUser);
    const student = await r.students.put({
      id: newId(),
      teacherId,
      userId: studentUser.id,
      name: `Aluno ${tag}`,
      email: studentUser.email,
      phone: "",
      birthDate: "2012-04-10",
      guardianName: "",
      cpf: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      levels: { [subject.id]: "B1" },
      goal: "",
      notes: "nota privada",
      status: "active",
      avatarColor: 0,
      createdAt: nowIso(),
    });
    const passage = await r.passages.put({
      id: newId(),
      teacherId,
      subjectId: subject.id,
      kind: "reading",
      title: `Texto ${tag}`,
      text: "Some text.",
      audioUrl: "",
      source: "",
      level: "A2",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    const mk = async (type: "single_choice" | "open", source: unknown, points: number): Promise<Question> => {
      const built = buildQuestion(type, source);
      if (!built.ok) throw new Error(built.error);
      return r.questions.put({
        id: newId(),
        teacherId,
        subjectId: subject.id,
        type,
        prompt: `Pergunta ${tag} ${type}`,
        instructions: "",
        mediaUrl: "",
        passageId: passage.id,
        level: "A2",
        skill: "reading",
        tags: [],
        points,
        explanation: "",
        status: "published",
        source: built.source,
        content: built.content,
        answerKey: built.answerKey,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    };
    const question = await mk("single_choice", { options: ["a", "b"], correct: 1 }, 1.5);
    const openQuestion = await mk("open", { minWords: 0, maxWords: 0, rubric: "", modelAnswer: "resposta modelo" }, 2);
    const activity: Activity = {
      id: newId(),
      teacherId,
      subjectId: subject.id,
      title: `Atividade ${tag}`,
      instructions: "",
      items: [
        { questionId: question.id, points: 1.5 },
        { questionId: openQuestion.id, points: 2 },
      ],
      timeLimitMin: 0,
      maxAttempts: 2,
      shuffle: false,
      showAnswers: "after_submit",
      archived: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await r.activities.put(activity);
    return { teacher, teacherUser: user, subject, student, studentUser, passage, question, openQuestion, activity };
  });
}

export async function assignTo(f: TeacherFixture): Promise<Assignment> {
  return withScope(f.teacher.id, (r) =>
    createAssignment(r, f.activity, { studentIds: [f.student.id], classId: "", releaseAt: nowIso(), dueAt: "" })
  );
}

export async function openAttempt(f: TeacherFixture, assignment: Assignment, attempt = 1) {
  return withScope({ teacherId: f.teacher.id, studentId: f.student.id }, (r) =>
    r.submissions.put({
      id: newId(),
      teacherId: f.teacher.id,
      assignmentId: assignment.id,
      studentId: f.student.id,
      attempt,
      startedAt: nowIso(),
      submittedAt: "",
      late: false,
      status: "in_progress",
      responses: {},
      answers: {},
      score: 0,
      maxScore: 0,
      generalFeedback: "",
    })
  );
}
