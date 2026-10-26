// Isolamento entre professores garantido pelo banco (RLS), não só pelo código.
// As consultas abaixo são SQL cru, SEM filtro de teacher_id: quem filtra é a RLS.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { SKIP, setupSchema } from "./setup.mts";
import { assignTo, makeTeacher, type TeacherFixture } from "./fixtures.mts";

describe("isolamento (RLS)", { skip: SKIP }, () => {
  let env: Awaited<ReturnType<typeof setupSchema>>;
  let A: TeacherFixture;
  let B: TeacherFixture;
  let withScope: typeof import("../../server/db/repo.ts").withScope;

  before(async () => {
    env = await setupSchema();
    ({ withScope } = await import("../../server/db/repo.ts"));
    A = await makeTeacher("a");
    B = await makeTeacher("b");
    await assignTo(A);
    await assignTo(B);
  });
  after(async () => env?.cleanup());

  test("o papel do app não tem BYPASSRLS nem é superusuário", async () => {
    const { rows } = await env.admin.query(
      `SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user`
    );
    console.log(`  papel: ${rows[0].rolname}, rolbypassrls=${rows[0].rolbypassrls}, rolsuper=${rows[0].rolsuper}`);
    assert.equal(rows[0].rolbypassrls, false);
    assert.equal(rows[0].rolsuper, false);
  });

  test("RLS está ativa e forçada em todas as tabelas com teacher_id", async () => {
    const { rows } = await env.admin.query(
      `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
         FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'teacher_id'
        WHERE c.relnamespace = current_schema()::regnamespace AND c.relkind = 'r' AND c.relname <> 'invitations'`
    );
    assert.ok(rows.length >= 16);
    for (const r of rows) assert.ok(r.relrowsecurity && r.relforcerowsecurity, `RLS desligada em ${r.relname}`);
  });

  test("consulta crua sem filtro, no contexto de A, não devolve linhas de B", async () => {
    const tables = ["subjects", "subject_skills", "subject_levels", "students", "student_levels", "passages", "questions",
      "activities", "activity_items", "assignments", "assignment_students", "submissions", "lessons", "classes"];
    await withScope(A.teacher.id, async (r) => {
      for (const t of tables) {
        const rows = await r.db.query<{ teacher_id: string }>(`SELECT teacher_id FROM ${t}`);
        assert.ok(rows.every((x) => x.teacher_id === A.teacher.id), `${t} vazou linhas de outro professor`);
      }
      const qs = await r.db.query<{ id: string }>(`SELECT id FROM questions`);
      assert.ok(qs.some((q) => q.id === A.question.id));
      assert.ok(!qs.some((q) => q.id === B.question.id));
    });
  });

  test("A não consegue alterar nem apagar linhas de B", async () => {
    await withScope(A.teacher.id, async (r) => {
      const upd = await r.db.query(`UPDATE questions SET prompt = 'hackeado' WHERE id = $1 RETURNING id`, [B.question.id]);
      const del = await r.db.query(`DELETE FROM students WHERE id = $1 RETURNING id`, [B.student.id]);
      assert.equal(upd.length, 0);
      assert.equal(del.length, 0);
    });
    const { rows } = await env.admin.query(`SELECT prompt FROM questions WHERE id = $1`, [B.question.id]);
    assert.notEqual(rows[0].prompt, "hackeado");
    assert.equal((await env.admin.query(`SELECT 1 FROM students WHERE id = $1`, [B.student.id])).rowCount, 1);
  });

  test("A não consegue gravar uma linha em nome de B (WITH CHECK)", async () => {
    await assert.rejects(
      withScope(A.teacher.id, (r) =>
        r.db.query(`INSERT INTO passages (teacher_id, subject_id, kind, title) VALUES ($1, $2, 'reading', 'x')`, [B.teacher.id, B.subject.id])
      ),
      (err: { code?: string }) => err.code === "42501"
    );
  });

  test("chave estrangeira composta impede apontar para o texto de outro professor", async () => {
    await assert.rejects(
      withScope({ system: true }, (r) =>
        r.db.query(`UPDATE questions SET passage_id = $2 WHERE id = $1`, [A.question.id, B.passage.id])
      ),
      (err: { code?: string }) => err.code === "23503"
    );
  });

  test("sem contexto, nenhuma linha de professor é visível", async () => {
    await withScope(null, async (r) => {
      for (const t of ["students", "questions", "submissions", "assignments"]) {
        const rows = await r.db.query(`SELECT 1 FROM ${t}`);
        assert.equal(rows.length, 0, t);
      }
    });
  });

  test("aluno não lê o banco de questões nem o gabarito, e só vê o que é dele", async () => {
    await withScope({ teacherId: A.teacher.id, studentId: A.student.id }, async (r) => {
      assert.equal((await r.db.query(`SELECT answer_key FROM questions`)).length, 0);
      assert.equal((await r.db.query(`SELECT 1 FROM activities`)).length, 0);
      assert.equal((await r.db.query(`SELECT 1 FROM passages`)).length, 0);
      const st = await r.db.query<{ id: string; notes: string }>(`SELECT id, notes FROM students`);
      assert.deepEqual(st.map((x) => x.id), [A.student.id]);
      const asg = await r.db.query(`SELECT 1 FROM assignments`);
      assert.equal(asg.length, 1);
    });
    // Aluno de A tentando se passar por aluno de B: nada aparece.
    await withScope({ teacherId: A.teacher.id, studentId: B.student.id }, async (r) => {
      assert.equal((await r.db.query(`SELECT 1 FROM students`)).length, 0);
      assert.equal((await r.db.query(`SELECT 1 FROM assignments`)).length, 0);
    });
  });

  test("tipos: numeric vira number e date continua AAAA-MM-DD", async () => {
    await withScope(A.teacher.id, async (r) => {
      const q = await r.questions.get(A.question.id);
      assert.equal(typeof q!.points, "number");
      assert.equal(q!.points, 1.5);
      const s = await r.students.get(A.student.id);
      assert.equal(s!.birthDate, "2012-04-10");
      const raw = await r.db.one<{ d: unknown; n: unknown }>(`SELECT date '2012-04-10' AS d, 2.25::numeric AS n`);
      assert.equal(raw!.d, "2012-04-10");
      assert.equal(raw!.n, 2.25);
    });
  });
});
