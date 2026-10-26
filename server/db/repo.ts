import "server-only";
import { transaction, type Db, type Scope } from "./client";
import { SUBJECT_TEMPLATES } from "@/lib/subjects";
import type {
  Activity,
  AppNotification,
  Assignment,
  AssignmentSummary,
  AuthTokenPurpose,
  StoredFile,
  ClassGroup,
  Invitation,
  Lesson,
  Passage,
  Question,
  QuestionFilters,
  QuestionListItem,
  Student,
  Subject,
  Submission,
  SubmissionSummary,
  Teacher,
  User,
} from "@/lib/types";

// Acesso aos dados em SQL. Duas formas de uso:
//   1. Avulsa (cada chamada é uma transação):  await students.get(teacherId, id)
//   2. Várias operações numa transação só:     await withScope(teacherId, async (r) => { ... r.students.get(id) ... })
// O "scope" define o contexto da RLS (ver client.ts e a migração 0001).

export type { Scope } from "./client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Ids vêm da URL; um valor que não é uuid simplesmente não existe. */
export const isUuid = (v: string | undefined | null): v is string => !!v && UUID_RE.test(v);

const nn = (v: string | undefined | null) => (v ? v : null); // "" → NULL
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// ---------------------------------------------------------------- mapeamento

const toUser = (r: Row): User => ({
  id: r.id,
  email: r.email,
  passwordHash: r.password_hash,
  role: r.role,
  name: r.name,
  blocked: r.blocked,
  createdAt: r.created_at,
  emailVerifiedAt: str(r.email_verified_at),
  sessionVersion: r.session_version ?? 1,
});

const toTeacher = (r: Row): Teacher => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  slug: r.slug,
  bio: r.bio,
  color: r.color,
  createdAt: r.created_at,
});

const toSubject = (r: Row): Subject => ({
  id: r.id,
  teacherId: r.teacher_id,
  templateKey: r.template_key,
  name: r.name,
  position: r.position,
  skills: r.skills ?? [],
  levels: r.levels ?? [],
});

const toStudent = (r: Row): Student => ({
  id: r.id,
  teacherId: r.teacher_id,
  userId: r.user_id ?? undefined,
  name: r.name,
  email: r.email,
  phone: r.phone,
  birthDate: str(r.birth_date),
  guardianName: r.guardian_name,
  cpf: r.cpf,
  cep: r.cep,
  street: r.street,
  number: r.number,
  complement: r.complement,
  neighborhood: r.neighborhood,
  city: r.city,
  state: r.state,
  levels: r.levels ?? {},
  goal: r.goal,
  notes: r.notes,
  status: r.status,
  avatarColor: r.avatar_color,
  deletionRequestedAt: r.deletion_requested_at ?? undefined,
  createdAt: r.created_at,
});

const toInvitation = (r: Row): Invitation => ({
  token: r.token,
  teacherId: r.teacher_id,
  studentId: r.student_id,
  email: r.email,
  expiresAt: r.expires_at,
  usedAt: r.used_at ?? undefined,
});

const toClass = (r: Row): ClassGroup => ({
  id: r.id,
  teacherId: r.teacher_id,
  subjectId: r.subject_id,
  name: r.name,
  level: str(r.level_code),
  description: r.description,
  studentIds: r.student_ids ?? [],
  archivedAt: str(r.archived_at),
  createdAt: r.created_at,
});

const toPassage = (r: Row): Passage => ({
  id: r.id,
  teacherId: r.teacher_id,
  subjectId: r.subject_id,
  kind: r.kind,
  title: r.title,
  text: r.text,
  audioUrl: r.audio_url,
  source: r.source,
  level: str(r.level_code),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toQuestion = (r: Row): Question => ({
  id: r.id,
  teacherId: r.teacher_id,
  subjectId: r.subject_id,
  type: r.type,
  prompt: r.prompt,
  instructions: r.instructions,
  mediaUrl: r.media_url,
  passageId: str(r.passage_id),
  level: str(r.level_code),
  skill: r.skill_key,
  tags: r.tags,
  points: r.points,
  explanation: r.explanation,
  status: r.status,
  source: r.source,
  content: r.content,
  answerKey: r.answer_key,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toQuestionListItem = (r: Row): QuestionListItem => ({
  id: r.id,
  subjectId: r.subject_id,
  type: r.type,
  prompt: r.prompt,
  passageId: str(r.passage_id),
  level: str(r.level_code),
  skill: r.skill_key,
  tags: r.tags,
  points: r.points,
  status: r.status,
  updatedAt: r.updated_at,
});

const toActivity = (r: Row): Activity => ({
  id: r.id,
  teacherId: r.teacher_id,
  subjectId: r.subject_id,
  title: r.title,
  instructions: r.instructions,
  items: r.items ?? [],
  timeLimitMin: r.time_limit_min,
  maxAttempts: r.max_attempts,
  shuffle: r.shuffle,
  showAnswers: r.show_answers,
  archived: r.archived,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toAssignment = (r: Row): Assignment => ({
  id: r.id,
  teacherId: r.teacher_id,
  activityId: r.activity_id,
  subjectId: r.subject_id,
  title: r.title,
  instructions: r.instructions,
  studentIds: r.student_ids ?? [],
  classId: str(r.class_id),
  releaseAt: r.release_at,
  dueAt: str(r.due_at),
  timeLimitMin: r.time_limit_min,
  maxAttempts: r.max_attempts,
  shuffle: r.shuffle,
  showAnswers: r.show_answers,
  questions: r.snapshot?.questions ?? [],
  passages: r.snapshot?.passages ?? [],
  createdAt: r.created_at,
});

const toAssignmentSummary = (r: Row): AssignmentSummary => {
  const { questions: _q, passages: _p, ...rest } = toAssignment(r);
  return { ...rest, questionCount: r.question_count, totalPoints: r.total_points };
};

const toSubmission = (r: Row): Submission => ({
  id: r.id,
  teacherId: r.teacher_id,
  assignmentId: r.assignment_id,
  studentId: r.student_id,
  attempt: r.attempt,
  startedAt: r.started_at,
  submittedAt: str(r.submitted_at),
  late: r.late,
  status: r.status,
  responses: r.responses ?? {},
  answers: r.answers ?? {},
  score: r.score,
  maxScore: r.max_score,
  generalFeedback: r.general_feedback,
});

const toSubmissionSummary = (r: Row): SubmissionSummary => {
  const { responses: _r, answers: _a, ...rest } = toSubmission(r);
  return rest;
};

const toFile = (r: Row): StoredFile => ({
  id: r.id,
  teacherId: r.teacher_id,
  uploadedBy: r.uploaded_by,
  purpose: r.purpose,
  studentId: str(r.student_id),
  submissionId: str(r.submission_id),
  questionId: str(r.question_id),
  storageKey: r.storage_key,
  originalName: r.original_name,
  contentType: r.content_type,
  sizeBytes: Number(r.size_bytes),
  status: r.status,
  createdAt: r.created_at,
});

const toLesson = (r: Row): Lesson => ({
  id: r.id,
  teacherId: r.teacher_id,
  studentId: str(r.student_id),
  classId: str(r.class_id),
  startsAt: r.starts_at,
  durationMin: r.duration_min,
  meetingUrl: r.meeting_url,
  topic: r.topic,
  notes: r.notes,
  vocabulary: r.vocabulary ?? [],
  attendance: r.attendance ?? {},
  status: r.status,
  seriesId: str(r.series_id),
  createdAt: r.created_at,
});

const toNotification = (r: Row): AppNotification => ({
  id: r.id,
  userId: r.user_id,
  text: r.text,
  href: r.href,
  createdAt: r.created_at,
  readAt: str(r.read_at),
});

// ---------------------------------------------------------------- consultas base

const SUBJECT_SELECT = `
  SELECT s.*,
    (SELECT coalesce(json_agg(json_build_object('key', k.key, 'label', k.label) ORDER BY k.position), '[]')
       FROM subject_skills k WHERE k.subject_id = s.id) AS skills,
    (SELECT coalesce(json_agg(json_build_object('code', l.code, 'label', l.label) ORDER BY l.position), '[]')
       FROM subject_levels l WHERE l.subject_id = s.id) AS levels
  FROM subjects s`;

const STUDENT_SELECT = `
  SELECT st.*,
    (SELECT coalesce(json_object_agg(sl.subject_id, sl.level_code), '{}')
       FROM student_levels sl WHERE sl.student_id = st.id) AS levels
  FROM students st`;

const CLASS_SELECT = `
  SELECT c.*,
    (SELECT coalesce(array_agg(m.student_id::text), '{}') FROM class_members m WHERE m.class_id = c.id) AS student_ids
  FROM classes c`;

const ACTIVITY_SELECT = `
  SELECT a.*,
    (SELECT coalesce(json_agg(json_build_object('questionId', i.question_id, 'points', i.points) ORDER BY i.position), '[]')
       FROM activity_items i WHERE i.activity_id = a.id) AS items
  FROM activities a`;

const ASSIGNMENT_SELECT = `
  SELECT a.*,
    (SELECT coalesce(array_agg(s.student_id::text), '{}') FROM assignment_students s WHERE s.assignment_id = a.id) AS student_ids
  FROM assignments a`;

// Sem o snapshot (JSONB com as questões e os textos): para listas e resumos.
const ASSIGNMENT_SUMMARY_SELECT = `
  SELECT a.id, a.teacher_id, a.activity_id, a.subject_id, a.class_id, a.title, a.instructions, a.release_at, a.due_at,
    a.time_limit_min, a.max_attempts, a.shuffle, a.show_answers, a.created_at,
    jsonb_array_length(coalesce(a.snapshot->'questions', '[]')) AS question_count,
    (SELECT coalesce(sum((q->>'activityPoints')::numeric), 0) FROM jsonb_array_elements(coalesce(a.snapshot->'questions', '[]')) q) AS total_points,
    (SELECT coalesce(array_agg(s.student_id::text), '{}') FROM assignment_students s WHERE s.assignment_id = a.id) AS student_ids
  FROM assignments a`;

const SUBMISSION_SUMMARY_SELECT = `
  SELECT id, teacher_id, assignment_id, student_id, attempt, started_at, submitted_at, late, status, score, max_score, general_feedback
  FROM submissions`;

const LESSON_SELECT = `
  SELECT l.*,
    (SELECT coalesce(json_object_agg(t.student_id, t.status), '{}') FROM lesson_attendance t WHERE t.lesson_id = l.id) AS attendance
  FROM lessons l`;

// ---------------------------------------------------------------- repositório

export function makeRepo(db: Db) {
  const repo = {
    db,

    users: {
      async all() {
        return (await db.query(`SELECT * FROM users ORDER BY created_at`)).map(toUser);
      },
      async get(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`SELECT * FROM users WHERE id = $1`, [id]);
        return r ? toUser(r) : null;
      },
      async byEmail(email: string) {
        const r = await db.one(`SELECT * FROM users WHERE email = lower(trim($1))`, [email]);
        return r ? toUser(r) : null;
      },
      async create(u: User) {
        await db.query(
          `INSERT INTO users (id, email, password_hash, role, name, blocked, created_at, email_verified_at)
           VALUES ($1, lower($2), $3, $4, $5, $6, $7, $8)`,
          [u.id, u.email, u.passwordHash, u.role, u.name, !!u.blocked, u.createdAt, nn(u.emailVerifiedAt)]
        );
        return { ...u, emailVerifiedAt: u.emailVerifiedAt ?? "", sessionVersion: 1 };
      },
      /** Troca a senha e derruba as outras sessões (nova versão). Devolve a conta atualizada. */
      async setPassword(id: string, passwordHash: string, opts: { verifyEmail?: boolean } = {}) {
        const r = await db.one(
          `UPDATE users SET password_hash = $2, session_version = session_version + 1,
             email_verified_at = CASE WHEN $3 THEN coalesce(email_verified_at, now()) ELSE email_verified_at END
           WHERE id = $1 RETURNING *`,
          [id, passwordHash, !!opts.verifyEmail]
        );
        return r ? toUser(r) : null;
      },
      async markEmailVerified(id: string) {
        await db.query(`UPDATE users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = $1`, [id]);
      },
      async put(u: User) {
        await db.query(`UPDATE users SET email = lower($2), password_hash = $3, name = $4, blocked = $5 WHERE id = $1`, [
          u.id,
          u.email,
          u.passwordHash,
          u.name,
          !!u.blocked,
        ]);
        return u;
      },
      async changeEmail(u: User, email: string) {
        return repo.users.put({ ...u, email: email.toLowerCase() });
      },
      async delete(u: User) {
        await db.query(`DELETE FROM users WHERE id = $1`, [u.id]);
      },
    },

    teachers: {
      async all() {
        return (await db.query(`SELECT * FROM teachers ORDER BY created_at`)).map(toTeacher);
      },
      async get(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`SELECT * FROM teachers WHERE id = $1`, [id]);
        return r ? toTeacher(r) : null;
      },
      async byUserId(userId: string) {
        const r = await db.one(`SELECT * FROM teachers WHERE user_id = $1`, [userId]);
        return r ? toTeacher(r) : null;
      },
      async bySlug(slug: string) {
        const r = await db.one(`SELECT * FROM teachers WHERE slug = lower($1)`, [slug]);
        return r ? toTeacher(r) : null;
      },
      async save(t: Teacher) {
        await db.query(
          `INSERT INTO teachers (id, user_id, name, slug, bio, color, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET name = $3, slug = $4, bio = $5, color = $6`,
          [t.id, t.userId, t.name, t.slug, t.bio, t.color, t.createdAt]
        );
        return t;
      },
    },

    subjects: {
      async all() {
        return (await db.query(`${SUBJECT_SELECT} ORDER BY s.position, s.created_at`)).map(toSubject);
      },
      async get(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`${SUBJECT_SELECT} WHERE s.id = $1`, [id]);
        return r ? toSubject(r) : null;
      },
      /** Cria uma disciplina copiando habilidades e níveis de um modelo. */
      async createFromTemplate(teacherId: string, templateKey: string, name?: string) {
        const tpl = SUBJECT_TEMPLATES[templateKey];
        if (!tpl) throw new Error(`Modelo de disciplina desconhecido: ${templateKey}`);
        const pos = await db.one<{ n: number }>(`SELECT count(*)::int AS n FROM subjects WHERE teacher_id = $1`, [teacherId]);
        const s = await db.one<{ id: string }>(
          `INSERT INTO subjects (teacher_id, template_key, name, position) VALUES ($1, $2, $3, $4) RETURNING id`,
          [teacherId, tpl.key, name ?? tpl.name, pos?.n ?? 0]
        );
        const id = s!.id;
        for (const [i, k] of tpl.skills.entries()) {
          await db.query(`INSERT INTO subject_skills (teacher_id, subject_id, key, label, position) VALUES ($1, $2, $3, $4, $5)`, [
            teacherId, id, k.key, k.label, i,
          ]);
        }
        for (const [i, l] of tpl.levels.entries()) {
          await db.query(`INSERT INTO subject_levels (teacher_id, subject_id, code, label, position) VALUES ($1, $2, $3, $4, $5)`, [
            teacherId, id, l.code, l.label, i,
          ]);
        }
        return (await repo.subjects.get(id))!;
      },
    },

    students: {
      async all() {
        return (await db.query(`${STUDENT_SELECT} ORDER BY st.name`)).map(toStudent);
      },
      async get(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`${STUDENT_SELECT} WHERE st.id = $1`, [id]);
        return r ? toStudent(r) : null;
      },
      /** Aluno ligado a uma conta de login (precisa de escopo system ou do professor). */
      async byUserId(userId: string) {
        const r = await db.one(`${STUDENT_SELECT} WHERE st.user_id = $1`, [userId]);
        return r ? toStudent(r) : null;
      },
      async put(s: Student) {
        await db.query(
          `INSERT INTO students (id, teacher_id, user_id, name, email, phone, birth_date, guardian_name, cpf, cep, street,
             number, complement, neighborhood, city, state, goal, notes, status, avatar_color, deletion_requested_at, created_at)
           VALUES ($1,$2,$3,$4,lower($5),$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
           ON CONFLICT (id) DO UPDATE SET user_id = $3, name = $4, email = lower($5), phone = $6, birth_date = $7,
             guardian_name = $8, cpf = $9, cep = $10, street = $11, number = $12, complement = $13, neighborhood = $14,
             city = $15, state = $16, goal = $17, notes = $18, status = $19, avatar_color = $20, deletion_requested_at = $21`,
          [
            s.id, s.teacherId, nn(s.userId), s.name, s.email, s.phone, nn(s.birthDate), s.guardianName, s.cpf, s.cep,
            s.street, s.number, s.complement, s.neighborhood, s.city, s.state, s.goal, s.notes, s.status, s.avatarColor,
            nn(s.deletionRequestedAt), s.createdAt,
          ]
        );
        await db.query(`DELETE FROM student_levels WHERE student_id = $1`, [s.id]);
        for (const [subjectId, level] of Object.entries(s.levels)) {
          if (!level) continue;
          await db.query(`INSERT INTO student_levels (teacher_id, student_id, subject_id, level_code) VALUES ($1, $2, $3, $4)`, [
            s.teacherId, s.id, subjectId, level,
          ]);
        }
        return s;
      },
      /** Atualização feita pelo próprio aluno (só os campos que ele pode mudar). */
      async updateSelf(id: string, fields: { phone?: string; deletionRequestedAt?: string }) {
        await db.query(
          `UPDATE students SET phone = coalesce($2, phone), deletion_requested_at = coalesce($3, deletion_requested_at) WHERE id = $1`,
          [id, fields.phone ?? null, fields.deletionRequestedAt ?? null]
        );
      },
      async remove(id: string) {
        if (!isUuid(id)) return;
        await db.query(`DELETE FROM students WHERE id = $1`, [id]);
      },
    },

    invitations: {
      async get(token: string) {
        const r = await db.one(`SELECT * FROM invitations WHERE token = $1`, [token]);
        return r ? toInvitation(r) : null;
      },
      async validForStudent(studentId: string) {
        const r = await db.one(
          `SELECT * FROM invitations WHERE student_id = $1 AND used_at IS NULL AND expires_at > now() ORDER BY expires_at DESC LIMIT 1`,
          [studentId]
        );
        return r ? toInvitation(r) : null;
      },
      async put(i: Invitation) {
        await db.query(
          `INSERT INTO invitations (token, teacher_id, student_id, email, expires_at, used_at) VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (token) DO UPDATE SET used_at = $6`,
          [i.token, i.teacherId, i.studentId, i.email, i.expiresAt, nn(i.usedAt)]
        );
      },
      async invalidateForStudent(studentId: string) {
        await db.query(`UPDATE invitations SET used_at = now() WHERE student_id = $1 AND used_at IS NULL`, [studentId]);
      },
    },

    classes: {
      async all() {
        return (await db.query(`${CLASS_SELECT} ORDER BY c.name`)).map(toClass);
      },
      async get(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`${CLASS_SELECT} WHERE c.id = $1`, [id]);
        return r ? toClass(r) : null;
      },
      async put(c: ClassGroup) {
        await db.query(
          `INSERT INTO classes (id, teacher_id, subject_id, name, level_code, description, archived_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET subject_id = $3, name = $4, level_code = $5, description = $6, archived_at = $7`,
          [c.id, c.teacherId, c.subjectId, c.name, nn(c.level), c.description, nn(c.archivedAt), c.createdAt]
        );
        await db.query(`DELETE FROM class_members WHERE class_id = $1`, [c.id]);
        for (const sid of c.studentIds) {
          await db.query(`INSERT INTO class_members (teacher_id, class_id, student_id) VALUES ($1, $2, $3)`, [c.teacherId, c.id, sid]);
        }
        return c;
      },
      async setArchived(id: string, archived: boolean) {
        if (!isUuid(id)) return;
        await db.query(`UPDATE classes SET archived_at = CASE WHEN $2 THEN coalesce(archived_at, now()) ELSE NULL END WHERE id = $1`, [id, archived]);
      },
      /** Quantas aulas da turma já foram realizadas (impedem a exclusão definitiva). */
      async doneLessonCount(id: string) {
        if (!isUuid(id)) return 0;
        return (await db.one<{ n: number }>(`SELECT count(*)::int AS n FROM lessons WHERE class_id = $1 AND status = 'done'`, [id]))?.n ?? 0;
      },
      async remove(id: string) {
        if (!isUuid(id)) return;
        await db.query(`DELETE FROM classes WHERE id = $1`, [id]);
      },
    },

    passages: {
      async all() {
        return (await db.query(`SELECT * FROM passages ORDER BY updated_at DESC`)).map(toPassage);
      },
      async titles() {
        return db.query<{ id: string; title: string }>(`SELECT id, title FROM passages`);
      },
      async get(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`SELECT * FROM passages WHERE id = $1`, [id]);
        return r ? toPassage(r) : null;
      },
      async put(p: Passage) {
        await db.query(
          `INSERT INTO passages (id, teacher_id, subject_id, kind, title, text, audio_url, source, level_code, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET subject_id = $3, kind = $4, title = $5, text = $6, audio_url = $7, source = $8,
             level_code = $9, updated_at = $11`,
          [p.id, p.teacherId, p.subjectId, p.kind, p.title, p.text, p.audioUrl, p.source, nn(p.level), p.createdAt, p.updatedAt]
        );
        return p;
      },
      async remove(id: string) {
        if (!isUuid(id)) return;
        await db.query(`DELETE FROM passages WHERE id = $1`, [id]);
      },
    },

    questions: {
      async all() {
        return (await db.query(`SELECT * FROM questions ORDER BY updated_at DESC`)).map(toQuestion);
      },
      async get(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`SELECT * FROM questions WHERE id = $1`, [id]);
        return r ? toQuestion(r) : null;
      },
      async put(q: Question) {
        await db.query(
          `INSERT INTO questions (id, teacher_id, subject_id, type, prompt, instructions, media_url, passage_id, level_code,
             skill_key, tags, points, explanation, status, source, content, answer_key, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
           ON CONFLICT (id) DO UPDATE SET subject_id = $3, type = $4, prompt = $5, instructions = $6, media_url = $7,
             passage_id = $8, level_code = $9, skill_key = $10, tags = $11, points = $12, explanation = $13, status = $14,
             source = $15, content = $16, answer_key = $17, updated_at = $19`,
          [
            q.id, q.teacherId, q.subjectId, q.type, q.prompt, q.instructions, q.mediaUrl, nn(q.passageId), nn(q.level),
            q.skill, q.tags, q.points, q.explanation, q.status, JSON.stringify(q.source), JSON.stringify(q.content),
            JSON.stringify(q.answerKey), q.createdAt, q.updatedAt,
          ]
        );
        return q;
      },
      /** Desvincula as questões de um texto (o texto vai ser excluído). */
      async exists() {
        return !!(await db.one(`SELECT 1 FROM questions LIMIT 1`));
      },
      /** Busca do banco de questões, filtrada no banco e sem as colunas grandes. */
      async search(f: QuestionFilters = {}) {
        const conds: string[] = [];
        const params: unknown[] = [];
        const p = (v: unknown) => `$${params.push(v)}`;
        if (f.subjectId) {
          if (!isUuid(f.subjectId)) return [];
          conds.push(`subject_id = ${p(f.subjectId)}`);
        }
        if (f.type) conds.push(`type = ${p(f.type)}`);
        if (f.skill) conds.push(`skill_key = ${p(f.skill)}`);
        if (f.level) conds.push(`level_code = ${p(f.level)}`);
        if (f.tag) conds.push(`tags @> ARRAY[${p(f.tag)}]::text[]`);
        if (!f.status || f.status === "active") conds.push(`status <> 'archived'`);
        else conds.push(`status = ${p(f.status)}`);
        if (f.text) {
          const t = p(f.text.toLowerCase());
          conds.push(`(position(${t} in lower(prompt)) > 0 OR EXISTS (SELECT 1 FROM unnest(tags) tg WHERE position(${t} in lower(tg)) > 0))`);
        }
        const rows = await db.query(
          `SELECT id, subject_id, type, prompt, passage_id, level_code, skill_key, tags, points, status, updated_at
             FROM questions ${conds.length ? `WHERE ${conds.join(" AND ")}` : ""}
            ORDER BY updated_at DESC LIMIT ${p(f.limit ?? 200)}`,
          params
        );
        return rows.map(toQuestionListItem);
      },
      /** Questões para listas (sem conteúdo nem gabarito), pelos ids. */
      async listByIds(ids: string[]) {
        const valid = ids.filter(isUuid);
        if (!valid.length) return [];
        const rows = await db.query(
          `SELECT id, subject_id, type, prompt, passage_id, level_code, skill_key, tags, points, status, updated_at
             FROM questions WHERE id = ANY($1::uuid[])`,
          [valid]
        );
        return rows.map(toQuestionListItem);
      },
      /** Contagem de questões não arquivadas e etiquetas usadas (de uma disciplina ou de todas). */
      async stats(subjectId?: string) {
        if (subjectId && !isUuid(subjectId)) return { active: 0, tags: [] as string[] };
        const r = await db.one<{ active: number; tags: string[] }>(
          `SELECT (SELECT count(*)::int FROM questions WHERE status <> 'archived' AND ($1::uuid IS NULL OR subject_id = $1)) AS active,
                  (SELECT coalesce(array_agg(DISTINCT tg ORDER BY tg), '{}') FROM questions, unnest(tags) tg
                    WHERE $1::uuid IS NULL OR subject_id = $1) AS tags`,
          [subjectId || null]
        );
        return { active: r?.active ?? 0, tags: r?.tags ?? [] };
      },
      async unlinkPassage(passageId: string) {
        await db.query(`UPDATE questions SET passage_id = NULL, updated_at = now() WHERE passage_id = $1`, [passageId]);
      },
    },

    activities: {
      async exists() {
        return !!(await db.one(`SELECT 1 FROM activities LIMIT 1`));
      },
      async all() {
        return (await db.query(`${ACTIVITY_SELECT} ORDER BY a.updated_at DESC`)).map(toActivity);
      },
      async get(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`${ACTIVITY_SELECT} WHERE a.id = $1`, [id]);
        return r ? toActivity(r) : null;
      },
      async put(a: Activity) {
        await db.query(
          `INSERT INTO activities (id, teacher_id, subject_id, title, instructions, time_limit_min, max_attempts, shuffle,
             show_answers, archived, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (id) DO UPDATE SET title = $4, instructions = $5, time_limit_min = $6, max_attempts = $7,
             shuffle = $8, show_answers = $9, archived = $10, updated_at = $12`,
          [a.id, a.teacherId, a.subjectId, a.title, a.instructions, a.timeLimitMin, a.maxAttempts, a.shuffle, a.showAnswers,
            a.archived, a.createdAt, a.updatedAt]
        );
        await db.query(`DELETE FROM activity_items WHERE activity_id = $1`, [a.id]);
        for (const [i, it] of a.items.entries()) {
          await db.query(
            `INSERT INTO activity_items (teacher_id, subject_id, activity_id, position, question_id, points) VALUES ($1,$2,$3,$4,$5,$6)`,
            [a.teacherId, a.subjectId, a.id, i, it.questionId, it.points]
          );
        }
        return a;
      },
    },

    assignments: {
      async all() {
        return (await db.query(`${ASSIGNMENT_SELECT} ORDER BY a.created_at DESC`)).map(toAssignment);
      },
      async get(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`${ASSIGNMENT_SELECT} WHERE a.id = $1`, [id]);
        return r ? toAssignment(r) : null;
      },
      async create(a: Assignment) {
        await db.query(
          `INSERT INTO assignments (id, teacher_id, activity_id, subject_id, class_id, title, instructions, release_at, due_at,
             time_limit_min, max_attempts, shuffle, show_answers, snapshot, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [a.id, a.teacherId, a.activityId, a.subjectId, nn(a.classId), a.title, a.instructions, a.releaseAt, nn(a.dueAt),
            a.timeLimitMin, a.maxAttempts, a.shuffle, a.showAnswers,
            JSON.stringify({ questions: a.questions, passages: a.passages }), a.createdAt]
        );
        for (const sid of a.studentIds) {
          await db.query(`INSERT INTO assignment_students (teacher_id, assignment_id, student_id) VALUES ($1, $2, $3)`, [
            a.teacherId, a.id, sid,
          ]);
        }
        return a;
      },
      async titles() {
        return db.query<{ id: string; title: string }>(`SELECT id, title FROM assignments`);
      },
      /** Sem a cópia congelada; com studentId, só os envios daquele aluno. */
      async summaries(opts: { studentId?: string } = {}) {
        if (opts.studentId !== undefined && !isUuid(opts.studentId)) return [];
        const where = opts.studentId
          ? `WHERE EXISTS (SELECT 1 FROM assignment_students s WHERE s.assignment_id = a.id AND s.student_id = $1)`
          : "";
        return (await db.query(`${ASSIGNMENT_SUMMARY_SELECT} ${where} ORDER BY a.created_at DESC`, opts.studentId ? [opts.studentId] : [])).map(
          toAssignmentSummary
        );
      },
      /** Envios completos (com as questões) atribuídos a um aluno: desempenho por habilidade. */
      async forStudent(studentId: string) {
        if (!isUuid(studentId)) return [];
        return (
          await db.query(
            `${ASSIGNMENT_SELECT} WHERE EXISTS (SELECT 1 FROM assignment_students s WHERE s.assignment_id = a.id AND s.student_id = $1)
             ORDER BY a.created_at DESC`,
            [studentId]
          )
        ).map(toAssignment);
      },
      async setDue(id: string, dueAt: string) {
        await db.query(`UPDATE assignments SET due_at = $2 WHERE id = $1`, [id, nn(dueAt)]);
      },
      async remove(id: string) {
        if (!isUuid(id)) return;
        await db.query(`DELETE FROM assignments WHERE id = $1`, [id]);
      },
    },

    submissions: {
      async all() {
        return (await db.query(`SELECT * FROM submissions ORDER BY started_at`)).map(toSubmission);
      },
      /** Tentativas sem as respostas, opcionalmente de um aluno ou de uma situação. */
      async summaries(opts: { studentId?: string; status?: Submission["status"] } = {}): Promise<SubmissionSummary[]> {
        if (opts.studentId !== undefined && !isUuid(opts.studentId)) return [];
        const conds: string[] = [];
        const params: unknown[] = [];
        if (opts.studentId) conds.push(`student_id = $${params.push(opts.studentId)}`);
        if (opts.status) conds.push(`status = $${params.push(opts.status)}`);
        const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
        return (await db.query(`${SUBMISSION_SUMMARY_SELECT} ${where} ORDER BY started_at`, params)).map(toSubmissionSummary);
      },
      /** Tentativas completas de um aluno (com as respostas). */
      async forStudent(studentId: string) {
        if (!isUuid(studentId)) return [];
        return (await db.query(`SELECT * FROM submissions WHERE student_id = $1 ORDER BY started_at`, [studentId])).map(toSubmission);
      },
      /**
       * Fila de correção: entregas esperando nota (com quantas respostas faltam
       * corrigir) e as últimas corrigidas. Sem as respostas em si.
       */
      async gradingQueue(recentLimit = 20) {
        const open = `(SELECT count(*)::int FROM jsonb_each(answers) e WHERE e.value->'score' = 'null'::jsonb) AS open_count`;
        const map = (r: Row) => ({ ...toSubmissionSummary(r), openCount: Number(r.open_count) });
        const pending = await db.query(`${SUBMISSION_SUMMARY_SELECT.replace("FROM submissions", `, ${open} FROM submissions`)} WHERE status = 'submitted' ORDER BY submitted_at`);
        const recent = await db.query(
          `${SUBMISSION_SUMMARY_SELECT.replace("FROM submissions", `, ${open} FROM submissions`)} WHERE status = 'graded' ORDER BY submitted_at DESC LIMIT $1`,
          [recentLimit]
        );
        return { pending: pending.map(map), recent: recent.map(map) };
      },
      async countByStatus(status: Submission["status"]) {
        return Number((await db.one<{ n: string }>(`SELECT count(*) AS n FROM submissions WHERE status = $1`, [status]))?.n ?? 0);
      },
      async get(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`SELECT * FROM submissions WHERE id = $1`, [id]);
        return r ? toSubmission(r) : null;
      },
      /** Lê e trava a tentativa até o fim da transação (evita entregas simultâneas). */
      async getForUpdate(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`SELECT * FROM submissions WHERE id = $1 FOR UPDATE`, [id]);
        return r ? toSubmission(r) : null;
      },
      async put(s: Submission) {
        await db.query(
          `INSERT INTO submissions (id, teacher_id, assignment_id, student_id, attempt, started_at, submitted_at, late, status,
             responses, answers, score, max_score, general_feedback)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           ON CONFLICT (id) DO UPDATE SET submitted_at = $7, late = $8, status = $9, responses = $10, answers = $11,
             score = $12, max_score = $13, general_feedback = $14`,
          [s.id, s.teacherId, s.assignmentId, s.studentId, s.attempt, s.startedAt, nn(s.submittedAt), s.late, s.status,
            JSON.stringify(s.responses), JSON.stringify(s.answers), s.score, s.maxScore, s.generalFeedback]
        );
        return s;
      },
    },

    lessons: {
      async all() {
        return (await db.query(`${LESSON_SELECT} ORDER BY l.starts_at`)).map(toLesson);
      },
      /** Aulas individuais do aluno e das turmas de que ele faz parte. */
      async forStudent(studentId: string) {
        if (!isUuid(studentId)) return [];
        return (
          await db.query(
            `${LESSON_SELECT} WHERE l.student_id = $1 OR l.class_id IN (SELECT m.class_id FROM class_members m WHERE m.student_id = $1)
             ORDER BY l.starts_at`,
            [studentId]
          )
        ).map(toLesson);
      },
      /** Aulas agendadas a partir de "from" (ISO), em ordem. */
      async upcoming(from: string) {
        return (await db.query(`${LESSON_SELECT} WHERE l.status = 'scheduled' AND l.starts_at > $1 ORDER BY l.starts_at`, [from])).map(toLesson);
      },
      async get(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`${LESSON_SELECT} WHERE l.id = $1`, [id]);
        return r ? toLesson(r) : null;
      },
      async put(l: Lesson) {
        await db.query(
          `INSERT INTO lessons (id, teacher_id, student_id, class_id, starts_at, duration_min, meeting_url, topic, notes,
             vocabulary, status, series_id, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO UPDATE SET starts_at = $5, duration_min = $6, meeting_url = $7, topic = $8, notes = $9,
             vocabulary = $10, status = $11`,
          [l.id, l.teacherId, nn(l.studentId), nn(l.classId), l.startsAt, l.durationMin, l.meetingUrl, l.topic, l.notes,
            l.vocabulary, l.status, nn(l.seriesId), l.createdAt]
        );
        await db.query(`DELETE FROM lesson_attendance WHERE lesson_id = $1`, [l.id]);
        for (const [sid, status] of Object.entries(l.attendance)) {
          await db.query(`INSERT INTO lesson_attendance (teacher_id, lesson_id, student_id, status) VALUES ($1, $2, $3, $4)`, [
            l.teacherId, l.id, sid, status,
          ]);
        }
        return l;
      },
      async remove(id: string) {
        if (!isUuid(id)) return;
        await db.query(`DELETE FROM lessons WHERE id = $1`, [id]);
      },
      async removeSeriesFrom(seriesId: string, from: string) {
        await db.query(`DELETE FROM lessons WHERE series_id = $1 AND starts_at >= $2`, [seriesId, from]);
      },
    },

    notifications: {
      async list(userId: string) {
        return (
          await db.query(`SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`, [userId])
        ).map(toNotification);
      },
      async unreadCount(userId: string) {
        const r = await db.one<{ n: number }>(`SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL`, [userId]);
        return r?.n ?? 0;
      },
      async add(userId: string, text: string, href: string) {
        await db.query(`INSERT INTO notifications (user_id, text, href) VALUES ($1, $2, $3)`, [userId, text, href]);
      },
      async markAllRead(userId: string) {
        await db.query(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [userId]);
      },
    },

    /** Metadados dos arquivos (ver server/storage e a migração 0004). A RLS decide quem vê. */
    files: {
      async get(id: string) {
        if (!isUuid(id)) return null;
        const r = await db.one(`SELECT * FROM files WHERE id = $1`, [id]);
        return r ? toFile(r) : null;
      },
      async create(f: Omit<StoredFile, "createdAt" | "status">) {
        const r = await db.one(
          `INSERT INTO files (id, teacher_id, uploaded_by, purpose, student_id, submission_id, question_id, storage_key,
             original_name, content_type, size_bytes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending') RETURNING *`,
          [f.id, f.teacherId, f.uploadedBy, f.purpose, nn(f.studentId), nn(f.submissionId), nn(f.questionId), f.storageKey,
            f.originalName, f.contentType, f.sizeBytes]
        );
        return toFile(r!);
      },
      async markReady(id: string, sizeBytes: number, contentType: string) {
        await db.query(`UPDATE files SET status = 'ready', size_bytes = $2, content_type = $3 WHERE id = $1`, [id, sizeBytes, contentType]);
      },
      async remove(id: string) {
        await db.query(`DELETE FROM files WHERE id = $1`, [id]);
      },
      /** Arquivos prontos de uma entrega (opcionalmente de uma questão). */
      async forSubmission(submissionId: string, questionId?: string) {
        if (!isUuid(submissionId)) return [];
        const rows = await db.query(
          `SELECT * FROM files WHERE submission_id = $1 AND status = 'ready' AND ($2::uuid IS NULL OR question_id = $2)
            ORDER BY created_at`,
          [submissionId, questionId && isUuid(questionId) ? questionId : null]
        );
        return rows.map(toFile);
      },
      async byIds(ids: string[]) {
        const valid = ids.filter(isUuid);
        if (!valid.length) return [];
        return (await db.query(`SELECT * FROM files WHERE id = ANY($1::uuid[])`, [valid])).map(toFile);
      },
      async forStudent(studentId: string) {
        if (!isUuid(studentId)) return [];
        return (await db.query(`SELECT * FROM files WHERE student_id = $1 ORDER BY created_at`, [studentId])).map(toFile);
      },
      /** Uploads que nunca foram confirmados (mais de 24 h): saem do banco; devolve as chaves para apagar. */
      async takeStalePending(olderThanMs = 24 * 60 * 60_000) {
        const rows = await db.query<{ storage_key: string }>(
          `DELETE FROM files WHERE status = 'pending' AND created_at < now() - $1 * interval '1 millisecond' RETURNING storage_key`,
          [olderThanMs]
        );
        return rows.map((x) => x.storage_key);
      },
      /** Liga as mídias do professor a um envio (só arquivos prontos de mídia dele). */
      async linkToAssignment(teacherId: string, assignmentId: string, fileIds: string[]) {
        const valid = [...new Set(fileIds.filter(isUuid))];
        if (!valid.length) return 0;
        const rows = await db.query(
          `INSERT INTO assignment_files (teacher_id, assignment_id, file_id)
           SELECT $1, $2, f.id FROM files f
            WHERE f.id = ANY($3::uuid[]) AND f.teacher_id = $1 AND f.purpose = 'question_media' AND f.status = 'ready'
           ON CONFLICT DO NOTHING RETURNING file_id`,
          [teacherId, assignmentId, valid]
        );
        return rows.length;
      },
      async linkedAssignmentCount(fileId: string) {
        const r = await db.one<{ n: number }>(`SELECT count(*)::int AS n FROM assignment_files WHERE file_id = $1`, [fileId]);
        return r?.n ?? 0;
      },
    },

    /** Tokens de uso único (só o hash fica no banco). Ver server/auth/tokens.ts. */
    authTokens: {
      /** Cria um token novo e invalida os anteriores ainda não usados da mesma finalidade. */
      async create(userId: string, purpose: AuthTokenPurpose, tokenHash: string, ttlMs: number) {
        await db.query(`UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`, [userId, purpose]);
        await db.query(
          `INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at) VALUES ($1, $2, $3, now() + $4 * interval '1 millisecond')`,
          [userId, purpose, tokenHash, ttlMs]
        );
      },
      /** Dono do token se ele ainda vale (sem gastar). */
      async peek(tokenHash: string, purpose: AuthTokenPurpose) {
        const r = await db.one<{ user_id: string }>(
          `SELECT user_id FROM auth_tokens WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()`,
          [tokenHash, purpose]
        );
        return r?.user_id ?? null;
      },
      /** Gasta o token, de forma atômica: dois usos simultâneos não passam os dois. */
      async consume(tokenHash: string, purpose: AuthTokenPurpose) {
        const r = await db.one<{ user_id: string }>(
          `UPDATE auth_tokens SET used_at = now()
            WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()
          RETURNING user_id`,
          [tokenHash, purpose]
        );
        return r?.user_id ?? null;
      },
    },

    /** Limite por janela fixa (login, pedidos de redefinição, reenvios). */
    rateLimits: {
      /** Quantas vezes a chave foi contada na janela atual (sem contar esta). */
      async peek(key: string, windowMs: number) {
        const r = await db.one<{ count: number }>(
          `SELECT count FROM rate_limits WHERE key = $1 AND window_start > now() - $2 * interval '1 millisecond'`,
          [key, windowMs]
        );
        return r?.count ?? 0;
      },
      /** Conta mais uma e devolve o total na janela (a janela recomeça quando vence). */
      async hit(key: string, windowMs: number) {
        const r = await db.one<{ count: number }>(
          `INSERT INTO rate_limits AS t (key, window_start, count) VALUES ($1, now(), 1)
           ON CONFLICT (key) DO UPDATE SET
             count = CASE WHEN t.window_start <= now() - $2 * interval '1 millisecond' THEN 1 ELSE t.count + 1 END,
             window_start = CASE WHEN t.window_start <= now() - $2 * interval '1 millisecond' THEN now() ELSE t.window_start END
           RETURNING count`,
          [key, windowMs]
        );
        return r!.count;
      },
      async clear(key: string) {
        await db.query(`DELETE FROM rate_limits WHERE key = $1`, [key]);
      },
    },

    meta: {
      /** Segredo das sessões, gerado uma vez e guardado no banco. */
      async secret() {
        const fresh = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
        await db.query(`INSERT INTO app_meta (key, value) VALUES ('session_secret', $1) ON CONFLICT (key) DO NOTHING`, [fresh]);
        return (await db.one<{ value: string }>(`SELECT value FROM app_meta WHERE key = 'session_secret'`))!.value;
      },
    },
  };
  return repo;
}

export type Repo = ReturnType<typeof makeRepo>;

/** Várias operações na mesma transação, com o contexto de RLS do scope. */
export function withScope<T>(scope: Scope, fn: (r: Repo) => Promise<T>): Promise<T> {
  return transaction(scope, (db) => fn(makeRepo(db)));
}

// ---------------------------------------------------------------- uso avulso
// Mantêm a forma usada pelo resto do código: cada chamada é uma transação.

type TeacherScope = Exclude<Scope, null>;

export const users = {
  all: () => withScope(null, (r) => r.users.all()),
  get: (id: string) => withScope(null, (r) => r.users.get(id)),
  byEmail: (email: string) => withScope(null, (r) => r.users.byEmail(email)),
  put: (u: User) => withScope(null, (r) => r.users.put(u)),
};

export const teachers = {
  all: () => withScope(null, (r) => r.teachers.all()),
  get: (id: string) => withScope(null, (r) => r.teachers.get(id)),
  byUserId: (userId: string) => withScope(null, (r) => r.teachers.byUserId(userId)),
  bySlug: (slug: string) => withScope(null, (r) => r.teachers.bySlug(slug)),
  save: (t: Teacher) => withScope(null, (r) => r.teachers.save(t)),
};

export const invitations = {
  get: (token: string) => withScope(null, (r) => r.invitations.get(token)),
  validForStudent: (studentId: string) => withScope(null, (r) => r.invitations.validForStudent(studentId)),
};

export const subjects = {
  all: (scope: TeacherScope) => withScope(scope, (r) => r.subjects.all()),
  get: (scope: TeacherScope, id: string) => withScope(scope, (r) => r.subjects.get(id)),
};

function collection<T>(pick: (r: Repo) => { all(): Promise<T[]>; get(id: string): Promise<T | null> }) {
  return {
    all: (scope: TeacherScope) => withScope(scope, (r) => pick(r).all()),
    get: (scope: TeacherScope, id: string) => withScope(scope, (r) => pick(r).get(id)),
  };
}

export const students = {
  ...collection<Student>((r) => r.students),
  put: (s: Student) => withScope(s.teacherId, (r) => r.students.put(s)),
};
export const classes = { ...collection<ClassGroup>((r) => r.classes), put: (c: ClassGroup) => withScope(c.teacherId, (r) => r.classes.put(c)) };
export const passages = { ...collection<Passage>((r) => r.passages), put: (p: Passage) => withScope(p.teacherId, (r) => r.passages.put(p)) };
export const questions = { ...collection<Question>((r) => r.questions), put: (q: Question) => withScope(q.teacherId, (r) => r.questions.put(q)) };
export const activities = { ...collection<Activity>((r) => r.activities), put: (a: Activity) => withScope(a.teacherId, (r) => r.activities.put(a)) };
export const assignments = collection<Assignment>((r) => r.assignments);
export const submissions = collection<Submission>((r) => r.submissions);
export const lessons = { ...collection<Lesson>((r) => r.lessons), put: (l: Lesson) => withScope(l.teacherId, (r) => r.lessons.put(l)) };

export const notifications = {
  list: (userId: string) => withScope(null, (r) => r.notifications.list(userId)),
  unreadCount: (userId: string) => withScope(null, (r) => r.notifications.unreadCount(userId)),
  markAllRead: (userId: string) => withScope(null, (r) => r.notifications.markAllRead(userId)),
};


export const meta = {
  secret: () => withScope(null, (r) => r.meta.secret()),
};
