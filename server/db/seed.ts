import "server-only";
// Dados de demonstração, criados na primeira vez que o banco é acessado.
// Contas de demonstração (todas com a senha DEMO_PASSWORD):
//   professora: sarah@teachersarah.com     professor: john@demo.com
//   alunos:     lucas.mendes@email.com, julia.santos@email.com,
//               rafael.almeida@email.com, marina.costa@email.com,
//               pedro.vasconcelos@email.com, ana.lima@email.com (aluna do John)
//   admin:      ADMIN_EMAIL / ADMIN_PASSWORD (variáveis de ambiente); em
//               desenvolvimento local, sem as variáveis: admin@demo.local
// Defina SEED_DEMO=false para começar sem dados de demonstração.
import { activities, classes, lessons, passages, questions, students, submissions, teachers, users } from "./repo";
import { hashPassword } from "@/server/auth/password";
import { buildQuestion, type Contents, type Sources } from "@/lib/question-types";
import { newId } from "@/lib/format";
import { createAssignment, gradeSubmission } from "@/server/services/assignments";
import type { Activity, Level, Question, QuestionType, Skill, Student, Teacher } from "@/lib/types";

export const DEMO_PASSWORD = "demo1234";

const day = 86_400_000;
const iso = (offsetDays: number, hour = 19) => {
  const d = new Date(Date.now() + offsetDays * day);
  d.setUTCHours(hour + 3, 0, 0, 0); // hora de Brasília
  return d.toISOString();
};

export async function seed(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL ?? (process.env.VERCEL ? "" : "admin@demo.local");
  const adminPassword = process.env.ADMIN_PASSWORD ?? (process.env.VERCEL ? "" : DEMO_PASSWORD);
  if (adminEmail && adminPassword) {
    await users.create({
      id: newId(),
      email: adminEmail.toLowerCase(),
      passwordHash: await hashPassword(adminPassword),
      role: "admin",
      name: "Administrador",
      createdAt: iso(-60),
    });
  }
  if (process.env.SEED_DEMO === "false") return;

  const pw = await hashPassword(DEMO_PASSWORD);

  async function makeTeacher(name: string, email: string, slug: string, color: string, bio: string) {
    const userId = newId();
    const teacher: Teacher = { id: newId(), userId, name, slug, bio, color, createdAt: iso(-60) };
    await users.create({ id: userId, email, passwordHash: pw, role: "teacher", name, teacherId: teacher.id, createdAt: iso(-60) });
    await teachers.save(teacher);
    return teacher;
  }

  async function makeStudent(t: Teacher, name: string, email: string, level: Level, extra: Partial<Student> = {}) {
    const s: Student = {
      id: newId(),
      teacherId: t.id,
      name,
      email,
      phone: "",
      birthDate: "",
      guardianName: "",
      cpf: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      level,
      goal: "",
      notes: "",
      status: "active",
      avatarColor: Math.floor(Math.random() * 5),
      createdAt: iso(-50),
      ...extra,
    };
    const userId = newId();
    s.userId = userId;
    await users.create({ id: userId, email, passwordHash: pw, role: "student", name, teacherId: t.id, studentId: s.id, createdAt: iso(-50) });
    await students.put(s);
    return s;
  }

  async function q<T extends QuestionType>(
    t: Teacher,
    type: T,
    prompt: string,
    source: Sources[T],
    opts: { skill: Skill; level: Level; tags?: string[]; passageId?: string; instructions?: string; explanation?: string; points?: number }
  ): Promise<Question> {
    const built = buildQuestion(type, source);
    if (!built.ok) throw new Error(`seed: ${built.error}`);
    const question: Question = {
      id: newId(),
      teacherId: t.id,
      type,
      prompt,
      instructions: opts.instructions ?? "",
      mediaUrl: "",
      passageId: opts.passageId ?? "",
      level: opts.level,
      skill: opts.skill,
      tags: opts.tags ?? [],
      points: opts.points ?? 1,
      explanation: opts.explanation ?? "",
      status: "published",
      source: built.source,
      content: built.content,
      answerKey: built.answerKey,
      createdAt: iso(-40),
      updatedAt: iso(-40),
    };
    return questions.put(question);
  }

  // ---------- Teacher Sarah ----------
  const sarah = await makeTeacher(
    "Sarah Ramos",
    "sarah@teachersarah.com",
    "teacher-sarah",
    "#378ADD",
    "Aulas de inglês online para adolescentes e adultos, do básico ao avançado."
  );
  const lucas = await makeStudent(sarah, "Lucas Mendes", "lucas.mendes@email.com", "B1", {
    phone: "(11) 98765-4321",
    city: "São Paulo",
    state: "SP",
    goal: "Conversação para reuniões de trabalho",
    notes: "Bom vocabulário; revisar past simple irregular.",
  });
  const julia = await makeStudent(sarah, "Júlia Santos", "julia.santos@email.com", "A2", {
    goal: "Intercâmbio no Canadá em 2027",
    city: "Campinas",
    state: "SP",
  });
  const rafael = await makeStudent(sarah, "Rafael Almeida", "rafael.almeida@email.com", "B2", {
    goal: "Certificação IELTS",
  });
  await makeStudent(sarah, "Marina Costa", "marina.costa@email.com", "C1", { goal: "Manter a fluência" });
  const pedro = await makeStudent(sarah, "Pedro Vasconcelos", "pedro.vasconcelos@email.com", "A1", {
    birthDate: "2012-04-10",
    guardianName: "Cláudia Vasconcelos",
  });

  const turma = {
    id: newId(),
    teacherId: sarah.id,
    name: "Turma B1 · terças",
    level: "B1" as Level,
    description: "Grupo de conversação, terças às 19h.",
    studentIds: [lucas.id, rafael.id, julia.id],
    createdAt: iso(-45),
  };
  await classes.put(turma);

  const london = await passages.put({
    id: newId(),
    teacherId: sarah.id,
    kind: "reading",
    title: "A Day in London",
    text:
      "Last summer, Emma visited London for the first time. She arrived early in the morning and took the Tube to Westminster. " +
      "First, she saw Big Ben and the Houses of Parliament. Then she walked along the River Thames to the London Eye. " +
      "The queue was very long, so she decided to visit the National Gallery instead. It was free, and she spent three hours there.\n\n" +
      "In the afternoon it started to rain. Emma bought an umbrella and went to Covent Garden, where she watched a street performer and ate fish and chips. " +
      "In the evening she went to a musical in the West End. She was tired but very happy. \"I want to come back next year,\" she said.",
    audioUrl: "",
    source: "Texto da professora",
    level: "A2",
    createdAt: iso(-40),
    updatedAt: iso(-40),
  });

  const qFill = await q(sarah, "fill_text", "Complete com o passado simples dos verbos.", {
    template: "Yesterday I [[went]] to the market and [[bought|got]] some apples. Then I [[made]] a pie.",
    caseSensitive: false,
  }, { skill: "grammar", level: "A2", tags: ["past simple"], explanation: "go → went, buy → bought, make → made." });

  const qSingle = await q(sarah, "single_choice", "Choose the correct option: \"She ___ to work by bus every day.\"", {
    options: ["go", "goes", "going", "gone"],
    correct: 1,
  }, { skill: "grammar", level: "A1", tags: ["present simple"], explanation: "Terceira pessoa do singular recebe -s." });

  const qMulti = await q(sarah, "multiple_choice", "Which of these words are irregular verbs?", {
    options: ["write", "play", "eat", "watch", "drink"],
    correct: [0, 2, 4],
    partial: true,
  }, { skill: "vocabulary", level: "A2", tags: ["past simple"] });

  const qOrder = await q(sarah, "ordering", "Put the words in order to make a question.", {
    items: ["Where", "did", "you", "go", "last", "weekend?"],
    joiner: "space",
  }, { skill: "grammar", level: "A2", tags: ["past simple", "questions"] });

  const qMatch = await q(sarah, "matching", "Match the words to their meanings.", {
    pairs: [
      { left: "borrow", right: "pegar emprestado" },
      { left: "lend", right: "emprestar" },
      { left: "rent", right: "alugar" },
    ],
    distractors: ["comprar"],
  }, { skill: "vocabulary", level: "B1", tags: ["false friends"] });

  const qChoiceFill = await q(sarah, "fill_choice", "Complete with the right preposition.", {
    template: "I was born [[in]] 1998. My birthday is [[on]] Monday. The class starts [[at]] 7 p.m.",
    distractors: ["by", "for"],
  }, { skill: "grammar", level: "A2", tags: ["prepositions"] });

  const qR1 = await q(sarah, "single_choice", "How did Emma get to Westminster?", {
    options: ["By bus", "By taxi", "By Tube", "On foot"],
    correct: 2,
  }, { skill: "reading", level: "A2", passageId: london.id });

  const qR2 = await q(sarah, "true_false", "Mark true (V) or false (F) according to the text.", {
    statements: [
      { text: "Emma went on the London Eye.", answer: false },
      { text: "The National Gallery was free.", answer: true },
      { text: "It rained in the afternoon.", answer: true },
    ],
  }, { skill: "reading", level: "A2", passageId: london.id });

  const qR3 = await q(sarah, "open", "Would you like to visit London? Why? Write 3 to 5 sentences.", {
    minWords: 20,
    maxWords: 120,
    rubric: "Uso do passado/futuro, coerência e vocabulário do texto.",
    modelAnswer: "Yes, I would like to visit London because...",
  }, { skill: "writing", level: "A2", passageId: london.id, points: 2 });

  await q(sarah, "open", "Describe your last holiday in 50–80 words.", {
    minWords: 50,
    maxWords: 80,
    rubric: "Past simple, conectivos (first, then, after that).",
    modelAnswer: "",
  }, { skill: "writing", level: "B1", tags: ["past simple"], points: 3 });

  const now = iso(-30);
  const act1: Activity = {
    id: newId(),
    teacherId: sarah.id,
    title: "Past simple: revisão",
    instructions: "Revise o passado simples antes da aula de terça.",
    items: [qFill, qSingle, qMulti, qOrder, qMatch, qChoiceFill].map((x) => ({ questionId: x.id, points: x.points })),
    timeLimitMin: 0,
    maxAttempts: 2,
    shuffle: false,
    showAnswers: "after_submit",
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  const act2: Activity = {
    id: newId(),
    teacherId: sarah.id,
    title: "Reading: A Day in London",
    instructions: "Leia o texto e responda às questões.",
    items: [qR1, qR2, qR3].map((x) => ({ questionId: x.id, points: x.points })),
    timeLimitMin: 30,
    maxAttempts: 1,
    shuffle: false,
    showAnswers: "after_due",
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  await activities.put(act1);
  await activities.put(act2);

  const as1 = await createAssignment(act1, {
    studentIds: [lucas.id, julia.id, rafael.id, pedro.id],
    classId: "",
    releaseAt: iso(-20),
    dueAt: iso(-5),
  });
  const as2 = await createAssignment(act2, {
    studentIds: turma.studentIds,
    classId: turma.id,
    releaseAt: iso(-3),
    dueAt: iso(4),
  });

  // Respostas de exemplo, montadas a partir das ids geradas.
  const content = <T extends QuestionType>(qq: Question) => qq.content as Contents[T];
  const optId = (qq: Question, i: number) => content<"single_choice">(qq).options[i].id;
  const ordered = (qq: Question) => (qq.answerKey as { order: string[] }).order;
  const matchPairs = (qq: Question) => (qq.answerKey as { pairs: Record<string, string> }).pairs;

  async function submit(asg: typeof as1, st: Student, responses: Record<string, unknown>, daysAgo: number) {
    const sub = gradeSubmission(asg, {
      id: newId(),
      teacherId: sarah.id,
      assignmentId: asg.id,
      studentId: st.id,
      attempt: 1,
      startedAt: iso(-daysAgo, 18),
      submittedAt: iso(-daysAgo, 19),
      late: false,
      status: "submitted",
      responses,
      answers: {},
      score: 0,
      maxScore: 0,
      generalFeedback: "",
    });
    await submissions.put(sub);
  }

  const multiIds = content<"multiple_choice">(qMulti).options;
  await submit(as1, lucas, {
    [qFill.id]: { blanks: { b1: "went", b2: "bought", b3: "maked" } },
    [qSingle.id]: { choice: optId(qSingle, 1) },
    [qMulti.id]: { choices: [multiIds[0].id, multiIds[2].id, multiIds[4].id] },
    [qOrder.id]: { order: ordered(qOrder) },
    [qMatch.id]: { pairs: matchPairs(qMatch) },
    [qChoiceFill.id]: { blanks: { b1: "in", b2: "on", b3: "at" } },
  }, 10);
  await submit(as1, rafael, {
    [qFill.id]: { blanks: { b1: "goed", b2: "got", b3: "made" } },
    [qSingle.id]: { choice: optId(qSingle, 0) },
    [qMulti.id]: { choices: [multiIds[0].id, multiIds[1].id] },
    [qOrder.id]: { order: [...ordered(qOrder)].reverse() },
    [qMatch.id]: { pairs: matchPairs(qMatch) },
    [qChoiceFill.id]: { blanks: { b1: "in", b2: "in", b3: "at" } },
  }, 7);
  const tf = content<"true_false">(qR2).statements;
  await submit(as2, julia, {
    [qR1.id]: { choice: optId(qR1, 2) },
    [qR2.id]: { answers: { [tf[0].id]: false, [tf[1].id]: true, [tf[2].id]: false } },
    [qR3.id]: {
      text: "Yes, I would like to visit London because I love museums. I want to see Big Ben and the London Eye. I also want to watch a musical in the West End with my friends.",
    },
  }, 1);

  // Aulas
  const lesson = (studentId: string, classId: string, offsetDays: number, topic: string, extra = {}) =>
    lessons.put({
      id: newId(),
      teacherId: sarah.id,
      studentId,
      classId,
      startsAt: iso(offsetDays),
      durationMin: 60,
      meetingUrl: "https://meet.google.com/",
      topic,
      notes: "",
      vocabulary: [],
      attendance: {},
      status: offsetDays < 0 ? "done" : "scheduled",
      seriesId: "",
      createdAt: iso(-30),
      ...extra,
    });
  await lesson(lucas.id, "", -7, "Past simple: verbos irregulares", {
    notes: "Lucas foi bem na conversação; revisar 'make/do'.",
    vocabulary: ["borrow", "lend", "rent"],
    attendance: { [lucas.id]: "present" },
  });
  await lesson(lucas.id, "", 2, "Reuniões de trabalho: expressões úteis");
  await lesson("", turma.id, 1, "Conversação: viagens");
  await lesson(julia.id, "", 3, "Preparação para o intercâmbio");
  await lesson(pedro.id, "", 0.2, "Cores e números");

  // ---------- Teacher John (para mostrar o isolamento) ----------
  const john = await makeTeacher("John Miller", "john@demo.com", "teacher-john", "#1D9E75", "Business English.");
  await makeStudent(john, "Ana Lima", "ana.lima@email.com", "B2", { goal: "Inglês para negócios" });
  await q(john, "single_choice", "Choose the best word: \"Let's ___ a meeting for Monday.\"", {
    options: ["schedule", "do", "make up", "put"],
    correct: 0,
  }, { skill: "vocabulary", level: "B2", tags: ["business"] });
}
