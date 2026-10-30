// Operações que alteram várias tabelas: ou tudo é gravado, ou nada.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { SKIP, setupSchema } from "./setup.mts";
import { assignTo, makeTeacher, openAttempt, type TeacherFixture } from "./fixtures.mts";

describe("transações", { skip: SKIP }, () => {
  let env: Awaited<ReturnType<typeof setupSchema>>;
  let A: TeacherFixture;
  let B: TeacherFixture;
  let repo: typeof import("../../server/db/repo.ts");
  let flows: typeof import("../../server/services/flows.ts");
  let services: typeof import("../../server/services/assignments.ts");
  const count = async (sql: string, params: unknown[] = []) => Number((await env.admin.query(sql, params)).rows[0].n);

  before(async () => {
    env = await setupSchema();
    repo = await import("../../server/db/repo.ts");
    flows = await import("../../server/services/flows.ts");
    services = await import("../../server/services/assignments.ts");
    A = await makeTeacher("a");
    B = await makeTeacher("b");
  });
  after(async () => env?.cleanup());

  const studentScope = () => ({ teacherId: A.teacher.id, studentId: A.student.id });
  const submit = (submissionId: string, responses: unknown, teacherUserId = A.teacherUser.id) =>
    repo.withScope(studentScope(), (r) =>
      flows.submitAttemptTx(r, { studentId: A.student.id, studentName: "Aluno", teacherUserId, submissionId, responses })
    );

  test("envio com um aluno de outro professor é desfeito por inteiro", async () => {
    const before = await count(`SELECT count(*) AS n FROM assignments WHERE teacher_id = $1`, [A.teacher.id]);
    const notes = await count(`SELECT count(*) AS n FROM notifications WHERE user_id = $1`, [A.studentUser.id]);
    await assert.rejects(
      repo.withScope(A.teacher.id, (r) =>
        services.createAssignment(r, A.activity, { studentIds: [A.student.id, B.student.id], classId: "", releaseAt: new Date().toISOString(), dueAt: "" })
      )
    );
    assert.equal(await count(`SELECT count(*) AS n FROM assignments WHERE teacher_id = $1`, [A.teacher.id]), before);
    assert.equal(await count(`SELECT count(*) AS n FROM notifications WHERE user_id = $1`, [A.studentUser.id]), notes);
  });

  test("envio grava cópia congelada, ligação com o aluno e notificação", async () => {
    const asg = await assignTo(A);
    assert.equal(asg.questions.length, 2);
    assert.equal(await count(`SELECT count(*) AS n FROM assignment_students WHERE assignment_id = $1`, [asg.id]), 1);
    // Editar a questão depois não muda a cópia do envio.
    await repo.withScope(A.teacher.id, async (r) => {
      const q = (await r.questions.get(A.question.id))!;
      await r.questions.put({ ...q, prompt: "Editada depois" });
      const again = (await r.assignments.get(asg.id))!;
      assert.notEqual(again.questions.find((x) => x.id === A.question.id)!.prompt, "Editada depois");
    });
  });

  test("entrega que falha no meio não deixa a tentativa pela metade", async () => {
    const asg = await assignTo(A);
    const sub = await openAttempt(A, asg);
    // Notificação para um usuário inexistente: a FK falha depois da nota já calculada.
    await assert.rejects(submit(sub.id, {}, "00000000-0000-4000-8000-000000000000"));
    const { rows } = await env.admin.query(`SELECT status FROM submissions WHERE id = $1`, [sub.id]);
    assert.equal(rows[0].status, "in_progress");
  });

  test("entrega e correção gravam nota e notificações", async () => {
    const asg = await assignTo(A);
    const sub = await openAttempt(A, asg);
    const q = asg.questions.find((x) => x.type === "single_choice")!;
    const correct = (q.answerKey as { correct: string }).correct;
    const res = await submit(sub.id, { [q.id]: { choice: correct }, [A.openQuestion.id]: { text: "minha resposta" } });
    assert.ok(!("error" in res));
    if ("error" in res) return;
    assert.equal(res.submission.status, "submitted"); // resposta aberta pendente
    assert.equal(res.submission.score, 1.5);

    const before = await count(`SELECT count(*) AS n FROM notifications WHERE user_id = $1`, [A.studentUser.id]);
    const graded = await repo.withScope(A.teacher.id, (r) =>
      flows.gradeAttemptTx(r, sub.id, { scores: { [A.openQuestion.id]: "1.5" }, feedback: {}, general: "Bom" })
    );
    assert.equal(graded!.status, "graded");
    assert.equal(graded!.score, 3);
    assert.equal(await count(`SELECT count(*) AS n FROM notifications WHERE user_id = $1`, [A.studentUser.id]), before + 1);
  });

  test("correção que falha no meio não grava a nota", async () => {
    const asg = await assignTo(A);
    const sub = await openAttempt(A, asg);
    await submit(sub.id, { [A.openQuestion.id]: { text: "resposta" } });
    // Falha simulada depois de gravar a nota: a transação inteira é desfeita.
    await assert.rejects(
      repo.withScope(A.teacher.id, async (r) => {
        await flows.gradeAttemptTx(r, sub.id, { scores: { [A.openQuestion.id]: "2" }, feedback: {}, general: "" });
        throw new Error("falha simulada depois de gravar");
      })
    );
    const { rows } = await env.admin.query(`SELECT status, score FROM submissions WHERE id = $1`, [sub.id]);
    assert.equal(rows[0].status, "submitted");
  });

  test("duas entregas simultâneas da mesma tentativa: só uma corrige e notifica", async () => {
    const asg = await assignTo(A);
    const sub = await openAttempt(A, asg);
    const before = await count(`SELECT count(*) AS n FROM notifications WHERE user_id = $1`, [A.teacherUser.id]);
    const [r1, r2] = await Promise.all([submit(sub.id, {}), submit(sub.id, {})]);
    const already = [r1, r2].filter((x) => !("error" in x) && x.already).length;
    assert.equal(already, 1);
    assert.equal(await count(`SELECT count(*) AS n FROM notifications WHERE user_id = $1`, [A.teacherUser.id]), before + 1);
  });

  test("não abre duas tentativas ao mesmo tempo", async () => {
    const asg = await assignTo(A);
    await openAttempt(A, asg, 1);
    await assert.rejects(openAttempt(A, asg, 2), (err: { code?: string }) => err.code === "23505");
  });

  test("cancelar o envio apaga as tentativas dele", async () => {
    const asg = await assignTo(A);
    await openAttempt(A, asg);
    await repo.withScope(A.teacher.id, (r) => r.assignments.remove(asg.id));
    assert.equal(await count(`SELECT count(*) AS n FROM submissions WHERE assignment_id = $1`, [asg.id]), 0);
    assert.equal(await count(`SELECT count(*) AS n FROM assignment_students WHERE assignment_id = $1`, [asg.id]), 0);
  });

  test("excluir o aluno (LGPD) apaga conta, tentativas, convites, níveis e vínculos", async () => {
    const asg = await assignTo(B);
    await openAttempt(B, asg);
    await repo.withScope(B.teacher.id, async (r) => {
      await r.invitations.put({ token: `tok-${Date.now()}`, teacherId: B.teacher.id, studentId: B.student.id, email: B.student.email, expiresAt: new Date(Date.now() + 86_400_000).toISOString() });
      await r.lessons.put({
        id: crypto.randomUUID(), teacherId: B.teacher.id, studentId: B.student.id, classId: "", startsAt: new Date().toISOString(),
        durationMin: 60, meetingUrl: "", topic: "", notes: "", vocabulary: [], attendance: {}, status: "scheduled", seriesId: "", createdAt: new Date().toISOString(),
      });
      assert.deepEqual(await flows.deleteStudentTx(r, B.student.id), { storageKeys: [] });
    });
    const id = B.student.id;
    for (const [table, col] of [["students", "id"], ["submissions", "student_id"], ["assignment_students", "student_id"], ["invitations", "student_id"], ["student_levels", "student_id"], ["lessons", "student_id"]]) {
      assert.equal(await count(`SELECT count(*) AS n FROM ${table} WHERE ${col} = $1`, [id]), 0, table);
    }
    assert.equal(await count(`SELECT count(*) AS n FROM users WHERE id = $1`, [B.studentUser.id]), 0);
  });
});
