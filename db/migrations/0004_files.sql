-- 0004_files: arquivos enviados (mídias das questões e entregas dos alunos).
--
-- No banco ficam só os metadados; o conteúdo fica no armazenamento (Vercel
-- Blob privado, ou .data/uploads no desenvolvimento local), pela storage_key.
-- O download passa sempre por /arquivos/<id>, que consulta esta tabela no
-- escopo de quem pede: a RLS decide quem pode ver.

CREATE TABLE files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    uuid NOT NULL REFERENCES teachers ON DELETE CASCADE,
  uploaded_by   text NOT NULL CHECK (uploaded_by IN ('teacher', 'student')),
  -- 'question_media': imagem ou áudio de questão/texto (do professor);
  -- 'submission': arquivo de uma entrega (do aluno).
  purpose       text NOT NULL CHECK (purpose IN ('question_media', 'submission')),
  student_id    uuid,
  submission_id uuid,
  question_id   uuid,  -- questão da cópia congelada a que a entrega responde
  storage_key   text NOT NULL UNIQUE,
  original_name text NOT NULL CHECK (length(original_name) BETWEEN 1 AND 200),
  content_type  text NOT NULL,
  size_bytes    bigint NOT NULL CHECK (size_bytes >= 0),
  status        text NOT NULL CHECK (status IN ('pending', 'ready')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, id),
  CHECK ((uploaded_by = 'student') = (student_id IS NOT NULL)),
  CHECK ((purpose = 'submission') = (uploaded_by = 'student')),
  -- submission_id pode virar NULL se o envio for cancelado (ver FK abaixo).
  CHECK (purpose <> 'submission' OR question_id IS NOT NULL),
  -- Excluir o aluno apaga os metadados dos arquivos dele (os objetos no
  -- armazenamento são apagados pelo app depois que a transação confirma).
  FOREIGN KEY (teacher_id, student_id) REFERENCES students (teacher_id, id) ON DELETE CASCADE,
  -- Cancelar um envio apaga as tentativas; o arquivo continua do aluno.
  -- (submissions não tem chave (teacher_id, id); a política de escrita do
  -- aluno e o app garantem que a tentativa é dele.)
  FOREIGN KEY (submission_id) REFERENCES submissions ON DELETE SET NULL
);
CREATE INDEX files_teacher_idx ON files (teacher_id, purpose, created_at DESC);
CREATE INDEX files_submission_idx ON files (submission_id) WHERE submission_id IS NOT NULL;
CREATE INDEX files_student_idx ON files (student_id) WHERE student_id IS NOT NULL;
CREATE INDEX files_pending_idx ON files (created_at) WHERE status = 'pending';

-- Mídias do professor usadas em cada envio (preenchida ao criar o envio, a
-- partir da cópia congelada). É o que libera a mídia para o aluno, e o que
-- impede apagá-la enquanto algum envio a usa (RESTRICT).
CREATE TABLE assignment_files (
  teacher_id    uuid NOT NULL,
  assignment_id uuid NOT NULL,
  file_id       uuid NOT NULL,
  PRIMARY KEY (assignment_id, file_id),
  FOREIGN KEY (teacher_id, assignment_id) REFERENCES assignments (teacher_id, id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id, file_id) REFERENCES files (teacher_id, id) ON DELETE RESTRICT
);
CREATE INDEX assignment_files_file_idx ON assignment_files (file_id);

ALTER TABLE files            ENABLE ROW LEVEL SECURITY; ALTER TABLE files            FORCE ROW LEVEL SECURITY;
ALTER TABLE assignment_files ENABLE ROW LEVEL SECURITY; ALTER TABLE assignment_files FORCE ROW LEVEL SECURITY;

-- Professor: tudo o que é dele.
CREATE POLICY teacher_all ON files            USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));
CREATE POLICY teacher_all ON assignment_files USING (app_owns(teacher_id)) WITH CHECK (app_owns(teacher_id));

-- Aluno, leitura: os arquivos que ele mesmo enviou e as mídias do professor
-- que estejam num envio atribuído a ele e já liberado. Nunca os de outro aluno.
CREATE POLICY student_read ON files FOR SELECT USING (
  app_student_of(teacher_id) AND (
    (uploaded_by = 'student' AND student_id = app_student_id())
    OR (uploaded_by = 'teacher' AND EXISTS (
      SELECT 1
        FROM assignment_files af
        JOIN assignments a ON a.id = af.assignment_id
        JOIN assignment_students s ON s.assignment_id = af.assignment_id
       WHERE af.file_id = files.id
         AND s.student_id = app_student_id()
         AND a.release_at <= now()))));
CREATE POLICY student_read ON assignment_files FOR SELECT USING (
  app_student_of(teacher_id) AND EXISTS (
    SELECT 1 FROM assignment_students s
     WHERE s.assignment_id = assignment_files.assignment_id AND s.student_id = app_student_id()));

-- Aluno, escrita: só arquivos de entrega dele mesmo.
CREATE POLICY student_insert ON files FOR INSERT WITH CHECK (
  app_student_of(teacher_id) AND uploaded_by = 'student' AND purpose = 'submission' AND student_id = app_student_id());
CREATE POLICY student_update ON files FOR UPDATE
  USING (app_student_of(teacher_id) AND uploaded_by = 'student' AND student_id = app_student_id())
  WITH CHECK (app_student_of(teacher_id) AND uploaded_by = 'student' AND purpose = 'submission' AND student_id = app_student_id());
CREATE POLICY student_delete ON files FOR DELETE
  USING (app_student_of(teacher_id) AND uploaded_by = 'student' AND student_id = app_student_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON files, assignment_files TO app_user;
