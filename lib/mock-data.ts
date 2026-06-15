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
