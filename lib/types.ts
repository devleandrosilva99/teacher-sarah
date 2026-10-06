// Entidades do sistema. Todo conteúdo de professor carrega teacherId e é
// guardado em chaves com escopo do professor (ver server/db/repo.ts).

export type Role = "admin" | "teacher" | "student";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  teacherId?: string;
  studentId?: string;
  blocked?: boolean;
  createdAt: string;
}

export interface Teacher {
  id: string;
  userId: string;
  name: string;
  slug: string;
  bio: string;
  color: string;
  createdAt: string;
}

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-Intermediate",
  C1: "Advanced",
  C2: "Proficient",
};

export const SKILLS = ["reading", "grammar", "vocabulary", "writing", "listening"] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_LABELS: Record<Skill, string> = {
  reading: "Leitura",
  grammar: "Gramática",
  vocabulary: "Vocabulário",
  writing: "Escrita",
  listening: "Compreensão auditiva",
};

export interface Student {
  id: string;
  teacherId: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  guardianName: string;
  cpf: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  level: Level;
  goal: string;
  notes: string;
  status: "active" | "archived";
  avatarColor: number;
  deletionRequestedAt?: string;
  createdAt: string;
}

export interface Invitation {
  token: string;
  teacherId: string;
  studentId: string;
  email: string;
  expiresAt: string;
  usedAt?: string;
}

export interface ClassGroup {
  id: string;
  teacherId: string;
  name: string;
  level: Level | "";
  description: string;
  studentIds: string[];
  createdAt: string;
}

export interface Passage {
  id: string;
  teacherId: string;
  kind: "reading" | "listening";
  title: string;
  text: string;
  audioUrl: string;
  source: string;
  level: Level | "";
  createdAt: string;
  updatedAt: string;
}

export const QUESTION_TYPES = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "fill_text",
  "fill_choice",
  "matching",
  "ordering",
  "open",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export type QuestionStatus = "draft" | "published" | "archived";

export interface Question {
  id: string;
  teacherId: string;
  type: QuestionType;
  prompt: string;
  instructions: string;
  mediaUrl: string;
  passageId: string;
  level: Level | "";
  skill: Skill;
  tags: string[];
  points: number;
  explanation: string;
  status: QuestionStatus;
  /** Estado do editor do professor (privado: pode conter respostas). */
  source: unknown;
  /** O que o aluno vê. */
  content: unknown;
  /** Gabarito (privado). */
  answerKey: unknown;
  createdAt: string;
  updatedAt: string;
}

/** Questão como enviada ao navegador do aluno: sem gabarito nem source. */
export interface PublicQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  instructions: string;
  mediaUrl: string;
  passageId: string;
  points: number;
  content: unknown;
}

export type ShowAnswers = "after_submit" | "after_due" | "never";

export interface ActivityItem {
  questionId: string;
  points: number;
}

export interface Activity {
  id: string;
  teacherId: string;
  title: string;
  instructions: string;
  items: ActivityItem[];
  timeLimitMin: number;
  maxAttempts: number;
  shuffle: boolean;
  showAnswers: ShowAnswers;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Cópia congelada de uma questão no momento da atribuição. */
export interface SnapshotQuestion extends Question {
  activityPoints: number;
}

export interface Assignment {
  id: string;
  teacherId: string;
  activityId: string;
  title: string;
  instructions: string;
  studentIds: string[];
  classId: string;
  releaseAt: string;
  dueAt: string;
  timeLimitMin: number;
  maxAttempts: number;
  shuffle: boolean;
  showAnswers: ShowAnswers;
  questions: SnapshotQuestion[];
  passages: Passage[];
  createdAt: string;
}

export interface AnswerRecord {
  response: unknown;
  score: number | null;
  maxScore: number;
  correct: boolean | null;
  auto: boolean;
  feedback: string;
  /** Acerto por item (lacuna, afirmação, par) para mostrar na correção. */
  detail?: Record<string, boolean>;
}

export interface Submission {
  id: string;
  teacherId: string;
  assignmentId: string;
  studentId: string;
  attempt: number;
  startedAt: string;
  submittedAt: string;
  late: boolean;
  status: "in_progress" | "submitted" | "graded";
  responses: Record<string, unknown>;
  answers: Record<string, AnswerRecord>;
  score: number;
  maxScore: number;
  generalFeedback: string;
}

export interface Lesson {
  id: string;
  teacherId: string;
  studentId: string;
  classId: string;
  startsAt: string;
  durationMin: number;
  meetingUrl: string;
  topic: string;
  notes: string;
  vocabulary: string[];
  attendance: Record<string, "present" | "absent">;
  status: "scheduled" | "done" | "canceled";
  seriesId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  text: string;
  href: string;
  createdAt: string;
  readAt: string;
}
