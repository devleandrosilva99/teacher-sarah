export interface StudentProfile {
  email: string;
  phone: string;
  birthDate: string;
  nationality: string;
  occupation: string;
  cpf: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  learningGoal: string;
  classSchedule: string;
  teacherNotes: string;
}

export const LEVEL_LABELS: Record<string, string> = {
  A1: "Beginner",
  A2: "Pre-Intermediate",
  B1: "Intermediate",
  B2: "Upper-Intermediate",
  C1: "Advanced",
};

export const AVATAR_PALETTE = [
  { bg: "#E6F1FB", fg: "#0C447C" },
  { bg: "#E1F5EE", fg: "#0F6E56" },
  { bg: "#FAECE7", fg: "#993C1D" },
  { bg: "#FBEAF0", fg: "#72243E" },
  { bg: "#EEEDFE", fg: "#3C3489" },
];

const ADDED_STUDENTS_KEY = "added_students";

export function loadAddedStudents(): Student[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ADDED_STUDENTS_KEY);
    return raw ? (JSON.parse(raw) as Student[]) : [];
  } catch {
    return [];
  }
}

export function saveAddedStudent(student: Student): void {
  const existing = loadAddedStudents();
  localStorage.setItem(ADDED_STUDENTS_KEY, JSON.stringify([...existing, student]));
}

export function findStudent(id: string, added: Student[] = []): Student | undefined {
  return students.find((s) => s.id === id) ?? added.find((s) => s.id === id);
}

export interface Student {
  id: string;
  initials: string;
  name: string;
  level: string;
  levelLabel: string;
  avatarColor: string;
  avatarTextColor: string;
  lastLessonDaysAgo: number;
  status: "on-track" | "homework-pending" | "inactive";
  averageScore: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  profile: StudentProfile;
}

export interface VocabWord {
  word: string;
}

export interface Exercise {
  id: number;
  type: string;
  total: number;
  score?: number;
  status: "completed" | "not-started";
}

export interface ErrorNote {
  wrong: string;
  wrongWord: string;
  correct: string;
  correctWord: string;
}

export interface Lesson {
  id: number;
  date: string;
  title: string;
  duration: string;
  status: "homework-pending" | "completed";
  completionPercent: number;
  exercisesDone: number;
  exercisesTotal: number;
  teacherComment: string;
  summary: string[];
  vocabulary: VocabWord[];
  exercises: Exercise[];
}

export interface StudentProgress {
  level: string;
  levelLabel: string;
  progressPercent: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  exercisesTotal: number;
  streakDays: number;
  accuracyRate: number;
  wordsLearned: number;
  hoursStudied: number;
  skills: {
    grammar: number;
    vocabulary: number;
    reading: number;
    listening: number;
  };
  evolution: number[];
  errorNotes: ErrorNote[];
}

export const students: Student[] = [
  {
    id: "lucas",
    initials: "LM",
    name: "Lucas Mendes",
    level: "A2",
    levelLabel: "Pre-Intermediate",
    avatarColor: "#E6F1FB",
    avatarTextColor: "#0C447C",
    lastLessonDaysAgo: 1,
    status: "homework-pending",
    averageScore: 84,
    lessonsCompleted: 18,
    lessonsTotal: 30,
    profile: {
      email: "lucas.mendes@email.com",
      phone: "(11) 99874-3210",
      birthDate: "1999-07-14",
      nationality: "Brasileira",
      occupation: "Desenvolvedor de software",
      cpf: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      learningGoal: "Comunicação profissional em reuniões internacionais e leitura de documentação técnica em inglês.",
      classSchedule: "Terças e quintas, 19h",
      teacherNotes: "Aprende rápido mas tende a confundir tempos verbais do passado. Responde bem a exemplos do dia a dia de dev (commits, pull requests). Fica mais engajado quando o conteúdo tem aplicação prática imediata.",
    },
  },
  {
    id: "julia",
    initials: "JS",
    name: "Júlia Santos",
    level: "B1",
    levelLabel: "Intermediate",
    avatarColor: "#E1F5EE",
    avatarTextColor: "#0F6E56",
    lastLessonDaysAgo: 2,
    status: "on-track",
    averageScore: 92,
    lessonsCompleted: 22,
    lessonsTotal: 30,
    profile: {
      email: "julia.santos@email.com",
      phone: "(21) 98765-4321",
      birthDate: "2001-03-22",
      nationality: "Brasileira",
      occupation: "Estudante de Relações Internacionais",
      cpf: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      learningGoal: "Fluência para intercâmbio acadêmico na Europa e preparação para o IELTS.",
      classSchedule: "Segundas e quartas, 10h",
      teacherNotes: "Excelente pronúncia e ótima memória para vocabulário. Muito dedicada, sempre faz os exercícios antes da aula. Precisa trabalhar mais listening com sotaque britânico.",
    },
  },
  {
    id: "rafael",
    initials: "RA",
    name: "Rafael Almeida",
    level: "A1",
    levelLabel: "Beginner",
    avatarColor: "#FAECE7",
    avatarTextColor: "#993C1D",
    lastLessonDaysAgo: 12,
    status: "inactive",
    averageScore: 61,
    lessonsCompleted: 8,
    lessonsTotal: 30,
    profile: {
      email: "rafael.almeida@email.com",
      phone: "(31) 97654-8901",
      birthDate: "1990-11-05",
      nationality: "Brasileira",
      occupation: "Gerente de logística",
      cpf: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      learningGoal: "Inglês básico para viagens internacionais e comunicação com fornecedores estrangeiros.",
      classSchedule: "Sábados, 9h",
      teacherNotes: "Dificuldade com pronúncia e timidez para falar. Precisa de incentivo constante. Recomendo retomar contato — sumiu após cancelar duas aulas seguidas em abril.",
    },
  },
  {
    id: "marina",
    initials: "MC",
    name: "Marina Costa",
    level: "B2",
    levelLabel: "Upper-Intermediate",
    avatarColor: "#FBEAF0",
    avatarTextColor: "#72243E",
    lastLessonDaysAgo: 1,
    status: "on-track",
    averageScore: 89,
    lessonsCompleted: 28,
    lessonsTotal: 40,
    profile: {
      email: "marina.costa@email.com",
      phone: "(48) 99123-7654",
      birthDate: "1995-08-30",
      nationality: "Brasileira",
      occupation: "Designer UX/UI freelancer",
      cpf: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      learningGoal: "Alcançar fluência para trabalhar remotamente com clientes americanos e escrever portfólio em inglês.",
      classSchedule: "Terças e sextas, 14h",
      teacherNotes: "Uma das melhores alunas. Já apresenta fluência conversacional consistente. Foco agora em nuances de escrita formal e vocabulário de negócios.",
    },
  },
  {
    id: "pedro",
    initials: "PV",
    name: "Pedro Vasconcelos",
    level: "A2",
    levelLabel: "Pre-Intermediate",
    avatarColor: "#E6F1FB",
    avatarTextColor: "#0C447C",
    lastLessonDaysAgo: 3,
    status: "homework-pending",
    averageScore: 78,
    lessonsCompleted: 15,
    lessonsTotal: 30,
    profile: {
      email: "pedro.vasconcelos@email.com",
      phone: "(85) 98812-0045",
      birthDate: "1997-01-18",
      nationality: "Brasileira",
      occupation: "Analista financeiro",
      cpf: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      learningGoal: "Inglês para negócios, leitura de relatórios internacionais e preparação para certificação Cambridge.",
      classSchedule: "Segundas e quintas, 18h30",
      teacherNotes: "Consistente mas precisa de mais disciplina com os exercícios em casa. Gosta de conteúdo relacionado a finanças e economia. Boa evolução nas últimas 4 semanas.",
    },
  },
];

export const lucasLessons: Lesson[] = [
  {
    id: 18,
    date: "14 de maio",
    title: "Present Perfect vs Simple Past",
    duration: "60min",
    status: "homework-pending",
    completionPercent: 60,
    exercisesDone: 3,
    exercisesTotal: 5,
    teacherComment:
      "Lucas, hoje trabalhamos a diferença entre os dois tempos. Foco nos exercícios 3 e 4 — você ainda confunde 'I have been' com 'I went'. Vamos revisar na próxima!",
    summary: [
      "Nesta aula revisamos quando usar o Present Perfect e o Simple Past em inglês. O Present Perfect conecta o passado ao presente, enquanto o Simple Past descreve ações concluídas em um tempo definido.",
      "Praticamos com frases como 'I have already eaten' vs 'I ate yesterday', explorando marcadores de tempo como already, yet, just, ever e never.",
    ],
    vocabulary: [
      { word: "already" },
      { word: "yet" },
      { word: "just" },
      { word: "ever" },
      { word: "never" },
      { word: "since" },
      { word: "for" },
      { word: "gone" },
    ],
    exercises: [
      {
        id: 1,
        type: "Múltipla escolha",
        total: 10,
        score: 9,
        status: "completed",
      },
      {
        id: 2,
        type: "Complete as lacunas",
        total: 8,
        score: 7,
        status: "completed",
      },
      {
        id: 3,
        type: "Flashcards de vocabulário",
        total: 8,
        status: "not-started",
      },
      { id: 4, type: "Ordenar palavras", total: 6, status: "not-started" },
      { id: 5, type: "Listening", total: 5, status: "not-started" },
    ],
  },
  {
    id: 17,
    date: "07 de maio",
    title: "Travel vocabulary & airport situations",
    duration: "60min",
    status: "completed",
    completionPercent: 90,
    exercisesDone: 5,
    exercisesTotal: 5,
    teacherComment: "Ótimo desempenho no role-play! Continue assim.",
    summary: [
      "Exploramos vocabulário essencial para situações de viagem: check-in, boarding, customs e luggage.",
      "O role-play no aeroporto foi excelente — boa pronúncia e fluência.",
    ],
    vocabulary: [],
    exercises: [],
  },
  {
    id: 16,
    date: "30 de abril",
    title: "Modal verbs: should, must, have to",
    duration: "60min",
    status: "completed",
    completionPercent: 75,
    exercisesDone: 4,
    exercisesTotal: 5,
    teacherComment: "Revisar uso de 'have to' vs 'must' para a próxima aula.",
    summary: [
      "Estudamos os verbos modais should, must e have to e suas diferenças de uso.",
      "Revisar especialmente a distinção entre obrigação interna (must) e externa (have to).",
    ],
    vocabulary: [],
    exercises: [],
  },
];

const juliaLessons: Lesson[] = [
  {
    id: 22,
    date: "10 de junho",
    title: "Real conditionals in conversation",
    duration: "60min",
    status: "completed",
    completionPercent: 100,
    exercisesDone: 5,
    exercisesTotal: 5,
    teacherComment: "Ótima fluência aplicando 'if + present, will'. Continue praticando em situações reais.",
    summary: [
      "Trabalhamos zero e first conditionals em diálogos cotidianos, com foco em situações de trabalho e estudo.",
    ],
    vocabulary: [],
    exercises: [],
  },
  {
    id: 21,
    date: "03 de junho",
    title: "Travel stories: narrating past experiences",
    duration: "60min",
    status: "completed",
    completionPercent: 95,
    exercisesDone: 5,
    exercisesTotal: 5,
    teacherComment: "Narração fluida do intercâmbio — só ajuste pequenos detalhes de pronúncia em 'although'.",
    summary: [
      "Praticamos narrativa em past simple e past continuous para descrever viagens, com transições e marcadores temporais.",
    ],
    vocabulary: [],
    exercises: [],
  },
  {
    id: 20,
    date: "27 de maio",
    title: "Phrasal verbs with 'get' and 'take'",
    duration: "60min",
    status: "completed",
    completionPercent: 90,
    exercisesDone: 5,
    exercisesTotal: 5,
    teacherComment: "Muito bem! Revisa 'take after' vs 'take over' antes da próxima.",
    summary: [
      "Estudamos 12 phrasal verbs comuns com 'get' (get along, get over, get into) e 'take' (take after, take off, take over).",
    ],
    vocabulary: [],
    exercises: [],
  },
];

const rafaelLessons: Lesson[] = [
  {
    id: 8,
    date: "12 de abril",
    title: "Talking about your family",
    duration: "60min",
    status: "homework-pending",
    completionPercent: 40,
    exercisesDone: 2,
    exercisesTotal: 5,
    teacherComment: "Rafael, conseguimos avançar na aula mas faltou completar os exercícios. Vamos retomar?",
    summary: [
      "Apresentamos vocabulário de família (parents, siblings, cousins) e estruturas com 'have got' para descrever parentesco.",
    ],
    vocabulary: [],
    exercises: [],
  },
  {
    id: 7,
    date: "05 de abril",
    title: "Numbers, dates, and time",
    duration: "60min",
    status: "completed",
    completionPercent: 80,
    exercisesDone: 4,
    exercisesTotal: 5,
    teacherComment: "Boa evolução nos números até 100 — pratica mais os ordinais.",
    summary: [
      "Trabalhamos números cardinais e ordinais, dias da semana, meses e leitura de horas no formato 12h e 24h.",
    ],
    vocabulary: [],
    exercises: [],
  },
  {
    id: 6,
    date: "29 de março",
    title: "Greetings and self-introduction",
    duration: "60min",
    status: "completed",
    completionPercent: 90,
    exercisesDone: 5,
    exercisesTotal: 5,
    teacherComment: "Excelente primeira aula! Já consegue se apresentar com confiança.",
    summary: [
      "Primeira aula com cumprimentos formais e informais, perguntas básicas (What's your name? Where are you from?) e respostas curtas.",
    ],
    vocabulary: [],
    exercises: [],
  },
];

const marinaLessons: Lesson[] = [
  {
    id: 28,
    date: "13 de junho",
    title: "Persuasive presentations in English",
    duration: "60min",
    status: "completed",
    completionPercent: 100,
    exercisesDone: 5,
    exercisesTotal: 5,
    teacherComment: "Sua apresentação ficou impecável — pronta para clientes internacionais!",
    summary: [
      "Estruturamos uma pitch presentation com hook, problem, solution e call-to-action, com foco em linking phrases formais.",
    ],
    vocabulary: [],
    exercises: [],
  },
  {
    id: 27,
    date: "06 de junho",
    title: "Idioms for everyday conversation",
    duration: "60min",
    status: "completed",
    completionPercent: 95,
    exercisesDone: 5,
    exercisesTotal: 5,
    teacherComment: "Ótimo uso de 'on the same page' e 'hit the ground running' no role-play.",
    summary: [
      "Trabalhamos 15 idioms comuns em ambiente de trabalho remoto e situações sociais com clientes.",
    ],
    vocabulary: [],
    exercises: [],
  },
  {
    id: 26,
    date: "30 de maio",
    title: "Writing professional emails",
    duration: "60min",
    status: "completed",
    completionPercent: 100,
    exercisesDone: 5,
    exercisesTotal: 5,
    teacherComment: "Tom e estrutura excelentes. Pode usar como template nas próximas propostas.",
    summary: [
      "Praticamos estrutura de e-mails profissionais: opening, body, polite closing — e diferenças entre tom formal e semi-formal.",
    ],
    vocabulary: [],
    exercises: [],
  },
];

const pedroLessons: Lesson[] = [
  {
    id: 15,
    date: "11 de junho",
    title: "Past simple: regular vs irregular verbs",
    duration: "60min",
    status: "homework-pending",
    completionPercent: 60,
    exercisesDone: 3,
    exercisesTotal: 5,
    teacherComment: "Pedro, faltam os 2 últimos exercícios. Foco nos irregulares (go/went, take/took) antes da próxima!",
    summary: [
      "Revisamos formação do past simple para verbos regulares (-ed) e a lista dos 30 irregulares mais usados.",
    ],
    vocabulary: [],
    exercises: [],
  },
  {
    id: 14,
    date: "04 de junho",
    title: "Talking about financial habits",
    duration: "60min",
    status: "completed",
    completionPercent: 80,
    exercisesDone: 4,
    exercisesTotal: 5,
    teacherComment: "Vocabulário de finanças bem absorvido — bom uso de 'save up' e 'cut back on'.",
    summary: [
      "Vocabulário de finanças pessoais (budget, expenses, savings, debt) com phrasal verbs relacionados.",
    ],
    vocabulary: [],
    exercises: [],
  },
  {
    id: 13,
    date: "28 de maio",
    title: "Making and changing appointments",
    duration: "60min",
    status: "completed",
    completionPercent: 85,
    exercisesDone: 5,
    exercisesTotal: 5,
    teacherComment: "Role-play de reagendamento ficou natural. Continue praticando expressões corteses.",
    summary: [
      "Estruturas para marcar, confirmar e reagendar compromissos — com foco em polidez (would, could, I'm afraid…).",
    ],
    vocabulary: [],
    exercises: [],
  },
];

const GENERIC_ERROR_NOTES: ErrorNote[] = [
  {
    wrong: "I have went to school yesterday.",
    wrongWord: "have went",
    correct: "I went to school yesterday.",
    correctWord: "went",
  },
  {
    wrong: "She don't like coffee.",
    wrongWord: "don't",
    correct: "She doesn't like coffee.",
    correctWord: "doesn't",
  },
];

function generateEvolution(lessonsCompleted: number, target: number): number[] {
  if (lessonsCompleted <= 1) return [];
  const points = Math.min(lessonsCompleted, 13);
  const start = Math.max(30, target - 30);
  const arr: number[] = [];
  for (let i = 0; i < points; i++) {
    const ratio = i / Math.max(1, points - 1);
    const base = start + (target - start) * ratio;
    const jitter = (i % 3 === 0 ? 3 : i % 3 === 1 ? -2 : 1);
    arr.push(Math.max(0, Math.min(100, Math.round(base + jitter))));
  }
  return arr;
}

function generateProgress(student: Student): StudentProgress {
  const accuracy = student.averageScore;
  const completed = student.lessonsCompleted;
  const streak =
    student.status === "inactive" ? 0 : student.status === "homework-pending" ? 4 : 9;
  return {
    level: student.level,
    levelLabel: student.levelLabel,
    progressPercent:
      student.lessonsTotal > 0 ? Math.round((completed / student.lessonsTotal) * 100) : 0,
    lessonsCompleted: completed,
    lessonsTotal: student.lessonsTotal,
    exercisesTotal: completed * 8,
    streakDays: streak,
    accuracyRate: accuracy,
    wordsLearned: completed * 8,
    hoursStudied: completed,
    skills: {
      grammar: Math.max(0, Math.min(100, accuracy + 4)),
      vocabulary: Math.max(0, Math.min(100, accuracy + 7)),
      reading: Math.max(0, Math.min(100, accuracy - 5)),
      listening: Math.max(0, Math.min(100, accuracy - 16)),
    },
    evolution: generateEvolution(completed, accuracy),
    errorNotes: completed > 0 ? GENERIC_ERROR_NOTES : [],
  };
}

const HAND_CRAFTED_LESSONS: Record<string, Lesson[]> = {
  lucas: lucasLessons,
  julia: juliaLessons,
  rafael: rafaelLessons,
  marina: marinaLessons,
  pedro: pedroLessons,
};

export function getStudentLessons(studentId: string): Lesson[] {
  return HAND_CRAFTED_LESSONS[studentId] ?? [];
}

export function getStudentProgress(studentId: string, student?: Student): StudentProgress {
  if (studentId === "lucas") return lucasProgress;
  if (student) return generateProgress(student);
  return {
    level: "A1",
    levelLabel: "Beginner",
    progressPercent: 0,
    lessonsCompleted: 0,
    lessonsTotal: 0,
    exercisesTotal: 0,
    streakDays: 0,
    accuracyRate: 0,
    wordsLearned: 0,
    hoursStudied: 0,
    skills: { grammar: 0, vocabulary: 0, reading: 0, listening: 0 },
    evolution: [],
    errorNotes: [],
  };
}

export const lucasProgress: StudentProgress = {
  level: "A2",
  levelLabel: "Pre-Intermediate",
  progressPercent: 62,
  lessonsCompleted: 18,
  lessonsTotal: 30,
  exercisesTotal: 142,
  streakDays: 7,
  accuracyRate: 84,
  wordsLearned: 156,
  hoursStudied: 22,
  skills: {
    grammar: 88,
    vocabulary: 91,
    reading: 79,
    listening: 68,
  },
  evolution: [52, 58, 55, 63, 67, 65, 72, 70, 75, 73, 79, 82, 85],
  errorNotes: [
    {
      wrong: "I have went to the beach yesterday.",
      wrongWord: "have went",
      correct: "I went to the beach yesterday.",
      correctWord: "went",
    },
    {
      wrong: "She don't like coffee.",
      wrongWord: "don't",
      correct: "She doesn't like coffee.",
      correctWord: "doesn't",
    },
  ],
};
