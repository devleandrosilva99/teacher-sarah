-- 0002_classes_archive: turmas passam a ser arquivadas em vez de excluídas.
--
-- Antes, excluir uma turma apagava as aulas dela (ON DELETE CASCADE), e o
-- professor perdia presença e o registro do que foi visto. Agora:
--   * a turma tem archived_at: arquivada, some das listas e seletores, mas
--     continua existindo (aulas, envios e relatórios mantêm o nome dela);
--   * a FK das aulas vira RESTRICT: o banco recusa apagar uma turma que ainda
--     tenha aulas. O app só permite a exclusão definitiva se nenhuma aula foi
--     realizada; nesse caso apaga antes as aulas agendadas/canceladas.

ALTER TABLE classes ADD COLUMN archived_at timestamptz;

ALTER TABLE lessons DROP CONSTRAINT lessons_teacher_id_class_id_fkey;
ALTER TABLE lessons
  ADD CONSTRAINT lessons_teacher_id_class_id_fkey
  FOREIGN KEY (teacher_id, class_id) REFERENCES classes (teacher_id, id) ON DELETE RESTRICT;

CREATE INDEX classes_teacher_active_idx ON classes (teacher_id) WHERE archived_at IS NULL;
