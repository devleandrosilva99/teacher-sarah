// Consultas leves e filtradas (Fase 2, item 2): devolvem o mesmo que a versão
// completa filtrada em memória, sem as colunas grandes e sem vazar entre
// professores.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { SKIP, setupSchema } from "./setup.mts";
import { assignTo, makeTeacher, openAttempt, type TeacherFixture } from "./fixtures.mts";
import { newId, nowIso } from "../../lib/format.ts";
import type { Assignment } from "../../lib/types.ts";

describe("consultas leves", { skip: SKIP }, () => {
  let env: Awaited<ReturnType<typeof setupSchema>>;
  let A: TeacherFixture;
  let B: TeacherFixture;
  let asgA: Assignment;
  let repo: typeof import("../../server/db/repo.ts");

  before(async () => {
    env = await setupSchema();
    repo = await import("../../server/db/repo.ts");
    A = await makeTeacher("a");
    B = await makeTeacher("b");
    asgA = await assignTo(A);
    await assignTo(B);
    const sub = await openAttempt(A, asgA);
    await repo.withScope(A.teacher.id, (r) =>
      r.submissions.put({
        ...sub,
        status: "submitted",
        submittedAt: nowIso(),
        answers: {
          [A.question.id]: { response: 1, score: 1.5, maxScore: 1.5, correct: true, feedback: "" },
          [A.openQuestion.id]: { response: "texto", score: null, maxScore: 2, correct: null, feedback: "" },
        },
        responses: { [A.openQuestion.id]: "texto" },
      } as typeof sub)
    );
  });
  after(async () => env?.cleanup());

  test("resumo do envio não traz a cópia congelada, mas traz contagem e pontos", async () => {
    const list = await repo.withScope(A.teacher.id, (r) => r.assignments.summaries());
    assert.deepEqual(list.map((a) => a.id), [asgA.id]);
    assert.equal(list[0].questionCount, 2);
    assert.equal(list[0].totalPoints, 3.5);
    assert.deepEqual(list[0].studentIds, [A.student.id]);
    assert.ok(!("questions" in list[0]) && !("passages" in list[0]));
    const forB = await repo.withScope(B.teacher.id, (r) => r.assignments.summaries({ studentId: A.student.id }));
    assert.deepEqual(forB, [], "B não vê envios de A nem filtrando pelo aluno de A");
  });

  test("por aluno: envios, tentativas e aulas só daquele aluno", async () => {
    const scope = { teacherId: A.teacher.id, studentId: A.student.id };
    const [sums, full, subs] = await repo.withScope(scope, async (r) => [
      await r.assignments.summaries({ studentId: A.student.id }),
      await r.assignments.forStudent(A.student.id),
      await r.submissions.summaries({ studentId: A.student.id }),
    ] as const);
    assert.equal(sums.length, 1);
    assert.equal(full[0].questions.length, 2);
    assert.equal(subs.length, 1);
    assert.ok(!("answers" in subs[0]) && !("responses" in subs[0]));
    assert.deepEqual(await repo.withScope(scope, (r) => r.submissions.forStudent(B.student.id)), []);

    const lessonId = newId();
    await repo.withScope(A.teacher.id, (r) =>
      r.lessons.put({
        id: lessonId, teacherId: A.teacher.id, studentId: A.student.id, classId: "", startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        durationMin: 60, meetingUrl: "", topic: "Aula", notes: "", vocabulary: [], attendance: {}, status: "scheduled", seriesId: "", createdAt: nowIso(),
      })
    );
    const ls = await repo.withScope(A.teacher.id, (r) => r.lessons.forStudent(A.student.id));
    assert.deepEqual(ls.map((l) => l.id), [lessonId]);
    const up = await repo.withScope(A.teacher.id, (r) => r.lessons.upcoming(nowIso()));
    assert.deepEqual(up.map((l) => l.id), [lessonId]);
    assert.deepEqual(await repo.withScope(B.teacher.id, (r) => r.lessons.forStudent(A.student.id)), []);
  });

  test("fila de correção conta as respostas sem nota", async () => {
    const q = await repo.withScope(A.teacher.id, (r) => r.submissions.gradingQueue());
    assert.equal(q.pending.length, 1);
    assert.equal(q.pending[0].openCount, 1);
    assert.ok(!("answers" in q.pending[0]));
    assert.equal(await repo.withScope(A.teacher.id, (r) => r.submissions.countByStatus("submitted")), 1);
    assert.equal(await repo.withScope(B.teacher.id, (r) => r.submissions.countByStatus("submitted")), 0);
    assert.deepEqual((await repo.withScope(B.teacher.id, (r) => r.submissions.gradingQueue())).pending, []);
  });

  test("busca de questões filtra no banco e não traz conteúdo nem gabarito", async () => {
    const s = (f: Parameters<import("../../server/db/repo.ts").Repo["questions"]["search"]>[0]) =>
      repo.withScope(A.teacher.id, (r) => r.questions.search(f));
    const all = await s({});
    assert.equal(all.length, 2);
    for (const x of all) assert.ok(!("answerKey" in x) && !("content" in x) && !("source" in x));
    assert.deepEqual((await s({ type: "open" })).map((x) => x.id), [A.openQuestion.id]);
    assert.deepEqual((await s({ text: "PERGUNTA A SINGLE" })).map((x) => x.id), [A.question.id]);
    assert.deepEqual(await s({ text: "%" }), [], "o texto não é tratado como curinga");
    assert.deepEqual(await s({ status: "archived" }), []);
    assert.equal((await s({ subjectId: A.subject.id, skill: "reading", level: "A2" })).length, 2);
    assert.deepEqual(await s({ subjectId: B.subject.id }), [], "disciplina de B não aparece para A");
    assert.equal((await s({ limit: 1 })).length, 1);
    const stats = await repo.withScope(A.teacher.id, (r) => r.questions.stats());
    assert.equal(stats.active, 2);
    const fromB = await repo.withScope(B.teacher.id, (r) => r.questions.search({ text: "pergunta a" }));
    assert.deepEqual(fromB, []);
    const byIds = await repo.withScope(A.teacher.id, (r) => r.questions.listByIds([A.question.id, B.question.id, "x"]));
    assert.deepEqual(byIds.map((x) => x.id), [A.question.id], "pelos ids, só as do próprio professor");
  });
});
