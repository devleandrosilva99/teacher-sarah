-- 0001_init: schema inicial em PostgreSQL.
--
-- Convenções
--   * Chaves uuid (gen_random_uuid), datas timestamptz.
--   * Toda tabela de dados do professor tem teacher_id. As chaves estrangeiras
--     entre essas tabelas incluem teacher_id, para o banco impedir referências
--     entre professores diferentes.
--   * Sem nome de schema fixo: o executor de migrações define o search_path
--     (os testes criam um schema temporário).
--   * RLS (no fim do arquivo): o app define app.teacher_id / app.student_id /
--     app.system com set_config(..., true) no início de cada transação.

-- ========================================================================
-- Tabelas globais
-- ========================================================================

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL CHECK (email = lower(email) AND email <> ''),
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  name          text NOT NULL,
  blocked       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (email);

CREATE TABLE teachers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES users (id),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,40}$'),
  bio        text NOT NULL DEFAULT '',
  color      text NOT NULL DEFAULT '#378ADD' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  text       text NOT NULL,
  href       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);

CREATE TABLE login_attempts (
  email    text PRIMARY KEY,
  count    integer NOT NULL,
  first_at timestamptz NOT NULL
);

-- Segredo da sessão, marca de seed feito etc.
CREATE TABLE app_meta (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- ========================================================================
-- Disciplinas (cada professor tem as suas; criadas a partir de um modelo)
-- ========================================================================

CREATE TABLE subjects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL REFERENCES teachers (id) ON DELETE CASCADE,
  template_key text NOT NULL,
  name         text NOT NULL CHECK (name <> ''),
  position     integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, name),
  UNIQUE (teacher_id, id)
);

CREATE TABLE subject_skills (
  teacher_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  key        text NOT NULL CHECK (key ~ '^[a-z0-9_]+$'),
  label      text NOT NULL,
  position   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (subject_id, key),
  FOREIGN KEY (teacher_id, subject_id) REFERENCES subjects (teacher_id, id) ON DELETE CASCADE
);

CREATE TABLE subject_levels (
  teacher_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  code       text NOT NULL CHECK (code <> ''),
  label      text NOT NULL,
  position   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (subject_id, code),
  FOREIGN KEY (teacher_id, subject_id) REFERENCES subjects (teacher_id, id) ON DELETE CASCADE
);

-- ========================================================================
-- Alunos (cadastro do professor; o login fica em users)
-- ========================================================================

CREATE TABLE students (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id            uuid NOT NULL REFERENCES teachers (id),
  user_id               uuid REFERENCES users (id) ON DELETE SET NULL,
  name                  text NOT NULL,
  email                 text NOT NULL CHECK (email = lower(email)),
  phone                 text NOT NULL DEFAULT '',
  birth_date            date,
  guardian_name         text NOT NULL DEFAULT '',
  cpf                   text NOT NULL DEFAULT '',
  cep                   text NOT NULL DEFAULT '',
  street                text NOT NULL DEFAULT '',
  number                text NOT NULL DEFAULT '',
  complement            text NOT NULL DEFAULT '',
  neighborhood          text NOT NULL DEFAULT '',
  city                  text NOT NULL DEFAULT '',
  state                 text NOT NULL DEFAULT '',
  goal                  text NOT NULL DEFAULT '',
  notes                 text NOT NULL DEFAULT '',
  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  avatar_color          smallint NOT NULL DEFAULT 0,
  deletion_requested_at timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, id),
  UNIQUE (teacher_id, email)
);
-- Regra atual: uma conta de login pertence a um único aluno (um professor).
-- Para unificar contas no futuro, basta remover este índice.
CREATE UNIQUE INDEX students_one_per_user ON students (user_id) WHERE user_id IS NOT NULL;

-- Nível do aluno em cada disciplina.
CREATE TABLE student_levels (
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  level_code text NOT NULL,
  PRIMARY KEY (student_id, subject_id),
  FOREIGN KEY (teacher_id, student_id) REFERENCES students (teacher_id, id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id, subject_id) REFERENCES subjects (teacher_id, id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id, level_code) REFERENCES subject_levels (subject_id, code) ON UPDATE CASCADE
);

CREATE TABLE invitations (
  token      text PRIMARY KEY,
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  email      text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  FOREIGN KEY (teacher_id, student_id) REFERENCES students (teacher_id, id) ON DELETE CASCADE
);
CREATE INDEX invitations_student_idx ON invitations (teacher_id, student_id);

-- ========================================================================
-- Turmas
-- ========================================================================

CREATE TABLE classes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL,
  subject_id  uuid NOT NULL,
  name        text NOT NULL,
  level_code  text,
  description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, id),
  FOREIGN KEY (teacher_id, subject_id) REFERENCES subjects (teacher_id, id),
  FOREIGN KEY (subject_id, level_code) REFERENCES subject_levels (subject_id, code) ON UPDATE CASCADE
);

CREATE TABLE class_members (
  teacher_id uuid NOT NULL,
  class_id   uuid NOT NULL,
  student_id uuid NOT NULL,
  PRIMARY KEY (class_id, student_id),
  FOREIGN KEY (teacher_id, class_id) REFERENCES classes (teacher_id, id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id, student_id) REFERENCES students (teacher_id, id) ON DELETE CASCADE
);
CREATE INDEX class_members_student_idx ON class_members (student_id);

-- ========================================================================
-- Conteúdo: leituras, questões, atividades
-- ========================================================================

CREATE TABLE passages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('reading', 'listening')),
  title      text NOT NULL,
  text       text NOT NULL DEFAULT '',
  audio_url  text NOT NULL DEFAULT '',
  source     text NOT NULL DEFAULT '',
  level_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id, id),
  FOREIGN KEY (teacher_id, subject_id) REFERENCES subjects (teacher_id, id),
  FOREIGN KEY (subject_id, level_code) REFERENCES subject_levels (subject_id, code) ON UPDATE CASCADE
);

CREATE TABLE questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL,
  subject_id  uuid NOT NULL,
  type        text NOT NULL,
  prompt      text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  media_url   text NOT NULL DEFAULT '',
  passage_id  uuid,
  level_code  text,
  skill_key   text NOT NULL,
  tags        text[] NOT NULL DEFAULT '{}',
  points      numeric(6,2) NOT NULL CHECK (points > 0),
  explanation text NOT NULL DEFAULT '',
  status      text NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  source      jsonb NOT NULL,  -- estado do editor (privado)
  content     jsonb NOT NULL,  -- o que o aluno vê
  answer_key  jsonb NOT NULL,  -- gabarito (privado)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id, id),
  FOREIGN KEY (teacher_id, subject_id) REFERENCES subjects (teacher_id, id),
  -- o texto precisa ser do mesmo professor e da mesma disciplina
  FOREIGN KEY (teacher_id, subject_id, passage_id)
    REFERENCES passages (teacher_id, subject_id, id) ON DELETE SET NULL (passage_id),
  FOREIGN KEY (subject_id, skill_key) REFERENCES subject_skills (subject_id, key) ON UPDATE CASCADE,
  FOREIGN KEY (subject_id, level_code) REFERENCES subject_levels (subject_id, code) ON UPDATE CASCADE
);
CREATE INDEX questions_teacher_idx ON questions (teacher_id, subject_id, status);
CREATE INDEX questions_passage_idx ON questions (passage_id) WHERE passage_id IS NOT NULL;
CREATE INDEX questions_tags_idx ON questions USING gin (tags);

CREATE TABLE activities (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     uuid NOT NULL,
  subject_id     uuid NOT NULL,
  title          text NOT NULL,
  instructions   text NOT NULL DEFAULT '',
  time_limit_min integer NOT NULL DEFAULT 0 CHECK (time_limit_min BETWEEN 0 AND 600),
  max_attempts   integer NOT NULL DEFAULT 1 CHECK (max_attempts BETWEEN 1 AND 10),
  shuffle        boolean NOT NULL DEFAULT false,
  show_answers   text NOT NULL CHECK (show_answers IN ('after_submit', 'after_due', 'never')),
  archived       boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, id),
  UNIQUE (teacher_id, subject_id, id),
  FOREIGN KEY (teacher_id, subject_id) REFERENCES subjects (teacher_id, id)
);

CREATE TABLE activity_items (
  teacher_id  uuid NOT NULL,
  subject_id  uuid NOT NULL,
  activity_id uuid NOT NULL,
  position    integer NOT NULL,
  question_id uuid NOT NULL,
  points      numeric(6,2) NOT NULL CHECK (points > 0),
  PRIMARY KEY (activity_id, position),
  UNIQUE (activity_id, question_id),
  -- questão e atividade da mesma disciplina e do mesmo professor
  FOREIGN KEY (teacher_id, subject_id, activity_id)
    REFERENCES activities (teacher_id, subject_id, id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id, subject_id, question_id)
    REFERENCES questions (teacher_id, subject_id, id)
);

-- ========================================================================
-- Envios (cópia congelada) e tentativas
-- ========================================================================

CREATE TABLE assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     uuid NOT NULL,
  activity_id    uuid NOT NULL,
  subject_id     uuid NOT NULL,
  class_id       uuid,
  title          text NOT NULL,
  instructions   text NOT NULL DEFAULT '',
  release_at     timestamptz NOT NULL,
  due_at         timestamptz,
  time_limit_min integer NOT NULL,
  max_attempts   integer NOT NULL,
  shuffle        boolean NOT NULL,
  show_answers   text NOT NULL CHECK (show_answers IN ('after_submit', 'after_due', 'never')),
  -- {"questions": [...], "passages": [...]}: cópia das questões (com gabarito) e textos
  snapshot       jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, id),
  CHECK (due_at IS NULL OR due_at > release_at),
  FOREIGN KEY (teacher_id, activity_id) REFERENCES activities (teacher_id, id),
  FOREIGN KEY (teacher_id, subject_id) REFERENCES subjects (teacher_id, id),
  FOREIGN KEY (teacher_id, class_id) REFERENCES classes (teacher_id, id) ON DELETE SET NULL (class_id)
);
CREATE INDEX assignments_activity_idx ON assignments (activity_id);

CREATE TABLE assignment_students (
  teacher_id    uuid NOT NULL,
  assignment_id uuid NOT NULL,
  student_id    uuid NOT NULL,
  PRIMARY KEY (assignment_id, student_id),
  FOREIGN KEY (teacher_id, assignment_id) REFERENCES assignments (teacher_id, id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id, student_id) REFERENCES students (teacher_id, id) ON DELETE CASCADE
);
CREATE INDEX assignment_students_student_idx ON assignment_students (student_id);

CREATE TABLE submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id       uuid NOT NULL,
  assignment_id    uuid NOT NULL,
  student_id       uuid NOT NULL,
  attempt          integer NOT NULL CHECK (attempt >= 1),
  started_at       timestamptz NOT NULL DEFAULT now(),
  submitted_at     timestamptz,
  late             boolean NOT NULL DEFAULT false,
  status           text NOT NULL CHECK (status IN ('in_progress', 'submitted', 'graded')),
  responses        jsonb NOT NULL DEFAULT '{}',  -- rascunho / respostas enviadas
  answers          jsonb NOT NULL DEFAULT '{}',  -- correção por questão
  score            numeric(8,2) NOT NULL DEFAULT 0,
  max_score        numeric(8,2) NOT NULL DEFAULT 0,
  general_feedback text NOT NULL DEFAULT '',
  UNIQUE (assignment_id, student_id, attempt),
  CHECK ((status = 'in_progress') = (submitted_at IS NULL)),
  FOREIGN KEY (teacher_id, assignment_id) REFERENCES assignments (teacher_id, id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id, student_id) REFERENCES students (teacher_id, id) ON DELETE CASCADE,
  -- só quem recebeu o envio pode ter tentativa
  FOREIGN KEY (assignment_id, student_id) REFERENCES assignment_students (assignment_id, student_id) ON DELETE CASCADE
);
-- No máximo uma tentativa aberta por aluno e envio.
CREATE UNIQUE INDEX submissions_one_open ON submissions (assignment_id, student_id) WHERE status = 'in_progress';
CREATE INDEX submissions_teacher_status_idx ON submissions (teacher_id, status);

-- ========================================================================
-- Aulas
-- ========================================================================

CREATE TABLE lessons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL,
  student_id   uuid,
  class_id     uuid,
  starts_at    timestamptz NOT NULL,
  duration_min integer NOT NULL CHECK (duration_min BETWEEN 15 AND 480),
  meeting_url  text NOT NULL DEFAULT '',
  topic        text NOT NULL DEFAULT '',
  notes        text NOT NULL DEFAULT '',
  vocabulary   text[] NOT NULL DEFAULT '{}',
  status       text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'done', 'canceled')),
  series_id    uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, id),
  CHECK ((student_id IS NULL) <> (class_id IS NULL)),
  FOREIGN KEY (teacher_id, student_id) REFERENCES students (teacher_id, id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id, class_id) REFERENCES classes (teacher_id, id) ON DELETE CASCADE
);
CREATE INDEX lessons_teacher_starts_idx ON lessons (teacher_id, starts_at);

CREATE TABLE lesson_attendance (
  teacher_id uuid NOT NULL,
  lesson_id  uuid NOT NULL,
  student_id uuid NOT NULL,
  status     text NOT NULL CHECK (status IN ('present', 'absent')),
  PRIMARY KEY (lesson_id, student_id),
  FOREIGN KEY (teacher_id, lesson_id) REFERENCES lessons (teacher_id, id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id, student_id) REFERENCES students (teacher_id, id) ON DELETE CASCADE
);

-- ========================================================================
-- Row Level Security
-- ========================================================================
-- Contexto definido pelo app no início de cada transação:
--   app.teacher_id  professor dono dos dados
--   app.student_id  definido nas telas do aluno (restringe ainda mais)
--   app.system      'on' só para administração, seed e manutenção
-- Sem contexto, nenhuma linha é visível.

CREATE FUNCTION app_teacher_id() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('app.teacher_id', true), '')::uuid $$;
CREATE FUNCTION app_student_id() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('app.student_id', true), '')::uuid $$;
CREATE FUNCTION app_is_system() RETURNS boolean LANGUAGE sql STABLE AS
  $$ SELECT coalesce(current_setting('app.system', true), '') = 'on' $$;
-- Professor (não aluno) dono da linha, ou sistema.
CREATE FUNCTION app_owns(row_teacher uuid) RETURNS boolean LANGUAGE sql STABLE AS
  $$ SELECT app_is_system() OR (row_teacher = app_teacher_id() AND app_student_id() IS NULL) $$;
-- Aluno logado do professor dono da linha.
CREATE FUNCTION app_student_of(row_teacher uuid) RETURNS boolean LANGUAGE sql STABLE AS
  $$ SELECT row_teacher = app_teacher_id() AND app_student_id() IS NOT NULL $$;

-- FORCE: o app conecta como dono das tabelas, que sem isso ignoraria a RLS.
ALTER TABLE subjects            ENABLE ROW LEVEL SECURITY; ALTER TABLE subjects            FORCE ROW LEVEL SECURITY;
ALTER TABLE subject_skills      ENABLE ROW LEVEL SECURITY; ALTER TABLE subject_skills      FORCE ROW LEVEL SECURITY;
ALTER TABLE subject_levels      ENABLE ROW LEVEL SECURITY; ALTER TABLE subject_levels      FORCE ROW LEVEL SECURITY;
ALTER TABLE students            ENABLE ROW LEVEL SECURITY; ALTER TABLE students            FORCE ROW LEVEL SECURITY;
ALTER TABLE student_levels      ENABLE ROW LEVEL SECURITY; ALTER TABLE student_levels      FORCE ROW LEVEL SECURITY;
ALTER TABLE classes             ENABLE ROW LEVEL SECURITY; ALTER TABLE classes             FORCE ROW LEVEL SECURITY;
ALTER TABLE class_members       ENABLE ROW LEVEL SECURITY; ALTER TABLE class_members       FORCE ROW LEVEL SECURITY;
ALTER TABLE passages            ENABLE ROW LEVEL SECURITY; ALTER TABLE passages            FORCE ROW LEVEL SECURITY;
ALTER TABLE questions           ENABLE ROW LEVEL SECURITY; ALTER TABLE questions           FORCE ROW LEVEL SECURITY;
ALTER TABLE activities          ENABLE ROW LEVEL SECURITY; ALTER TABLE activities          FORCE ROW LEVEL SECURITY;
ALTER TABLE activity_items      ENABLE ROW LEVEL SECURITY; ALTER TABLE activity_items      FORCE ROW LEVEL SECURITY;
ALTER TABLE assignments         ENABLE ROW LEVEL SECURITY; ALTER TABLE assignments         FORCE ROW LEVEL SECURITY;
ALTER TABLE assignment_students ENABLE ROW LEVEL SECURITY; ALTER TABLE assignment_students FORCE ROW LEVEL SECURITY;
ALTER TABLE submissions         ENABLE ROW LEVEL SECURITY; ALTER TABLE submissions         FORCE ROW LEVEL SECURITY;
ALTER TABLE lessons             ENABLE ROW LEVEL SECURITY; ALTER TABLE lessons             FORCE ROW LEVEL SECURITY;
ALTER TABLE lesson_attendance   ENABLE ROW LEVEL SECURITY; ALTER TABLE lesson_attendance   FORCE ROW LEVEL SECURITY;

-- Professor: acesso total às próprias linhas, em todas as tabelas.
CREATE POLICY teacher_all ON subjects            USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON subject_skills      USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON subject_levels      USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON students            USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON student_levels      USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON classes             USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON class_members       USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON passages            USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON questions           USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON activities          USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON activity_items      USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON assignments         USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON assignment_students USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON submissions         USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON lessons             USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON lesson_attendance   USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));

-- Aluno: o banco de questões, leituras, atividades e turmas não tem política
-- para ele, então fica invisível (inclusive o gabarito em questions.answer_key).
-- Ele lê só o que é dele:
CREATE POLICY student_read ON subjects       FOR SELECT USING (app_student_of(teacher_id));
CREATE POLICY student_read ON subject_skills FOR SELECT USING (app_student_of(teacher_id));
CREATE POLICY student_read ON subject_levels FOR SELECT USING (app_student_of(teacher_id));
CREATE POLICY student_self ON students       FOR SELECT USING (app_student_of(teacher_id) AND id = app_student_id());
-- O aluno atualiza o próprio cadastro (telefone, pedido de exclusão).
CREATE POLICY student_self_update ON students FOR UPDATE
  USING (app_student_of(teacher_id) AND id = app_student_id())
  WITH CHECK (app_student_of(teacher_id) AND id = app_student_id());
CREATE POLICY student_self ON student_levels      FOR SELECT USING (app_student_of(teacher_id) AND student_id = app_student_id());
CREATE POLICY student_self ON class_members       FOR SELECT USING (app_student_of(teacher_id) AND student_id = app_student_id());
CREATE POLICY student_self ON assignment_students FOR SELECT USING (app_student_of(teacher_id) AND student_id = app_student_id());
CREATE POLICY student_self ON lesson_attendance   FOR SELECT USING (app_student_of(teacher_id) AND student_id = app_student_id());
CREATE POLICY student_assigned ON assignments FOR SELECT USING (
  app_student_of(teacher_id) AND EXISTS (
    SELECT 1 FROM assignment_students s
    WHERE s.assignment_id = assignments.id AND s.student_id = app_student_id()));
CREATE POLICY student_own ON lessons FOR SELECT USING (
  app_student_of(teacher_id) AND (
    student_id = app_student_id()
    OR EXISTS (SELECT 1 FROM class_members m
               WHERE m.class_id = lessons.class_id AND m.student_id = app_student_id())));
-- Tentativas: o aluno lê, abre e atualiza só as próprias.
CREATE POLICY student_own ON submissions
  USING (app_student_of(teacher_id) AND student_id = app_student_id())
  WITH CHECK (app_student_of(teacher_id) AND student_id = app_student_id());
