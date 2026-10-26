// Entidades do sistema (espelham as tabelas de db/migrations/0001_init.sql).
// Datas são strings ISO; datas sem hora (birthDate) são "AAAA-MM-DD".

export type Role = "admin" | "teacher" | "student";

/** Conta de login (tabela users). Não guarda vínculo com professor ou aluno. */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  blocked: boolean;
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

/** Código do nível (ex.: "B1") e chave da habilidade (ex.: "grammar") de uma disciplina. */
export type Level = string;
export type Skill = string;

export interface Subject {
  id: string;
  teacherId: string;
  templateKey: string;
  name: string;
  position: number;
  skills: { key: Skill; label: string }[];
  levels: { code: Level; label: string }[];
}

export interface Student {
  id: string;
  teacherId: string;
  /** Conta de login (users.id), quando o aluno já ativou o acesso. */
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
  /** Nível por disciplina: subjectId → código do nível. */
  levels: Record<string, Level>;
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
  subjectId: string;
  name: string;
  level: Level | "";
  description: string;
  studentIds: string[];
  /** Turma arquivada: some das listas e seletores, mas mantém o histórico. */
  archivedAt: string;
  createdAt: string;
}

export interface Passage {
  id: string;
  teacherId: string;
  subjectId: string;
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
  subjectId: string;
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
  subjectId: string;
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
  /** Rótulo da habilidade na época do envio (para relatórios). */
  skillLabel: string;
}

export interface Assignment {
  id: string;
  teacherId: string;
  activityId: string;
  subjectId: string;
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
