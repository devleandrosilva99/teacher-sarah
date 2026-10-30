// Turmas: arquivar em vez de excluir (migração 0002).
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { SKIP, setupSchema } from "./setup.mts";
import { makeTeacher, type TeacherFixture } from "./fixtures.mts";
import type { ClassGroup, Lesson } from "../../lib/types.ts";

describe("turmas arquivadas", { skip: SKIP }, () => {
  let env: Awaited<ReturnType<typeof setupSchema>>;
  let A: TeacherFixture;
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
  });
  after(async () => env?.cleanup());

  async function makeClass(name: string): Promise<ClassGroup> {
    return repo.withScope(A.teacher.id, (r) =>
      r.classes.put({
        id: crypto.randomUUID(), teacherId: A.teacher.id, subjectId: A.subject.id, name, level: "", description: "",
        studentIds: [A.student.id], archivedAt: "", createdAt: new Date().toISOString(),
      })
    );
  }
  async function makeLesson(classId: string, status: Lesson["status"], days: number): Promise<Lesson> {
    return repo.withScope(A.teacher.id, (r) =>
      r.lessons.put({
        id: crypto.randomUUID(), teacherId: A.teacher.id, studentId: "", classId, startsAt: new Date(Date.now() + days * 86_400_000).toISOString(),
        durationMin: 60, meetingUrl: "", topic: "Aula", notes: "", vocabulary: [], attendance: {}, status, seriesId: "", createdAt: new Date().toISOString(),
      })
    );
  }

  test("arquivar e restaurar mantém a turma e as aulas", async () => {
    const c = await makeClass("Turma 1");
    const l = await makeLesson(c.id, "done", -3);
    await repo.withScope(A.teacher.id, (r) => r.classes.setArchived(c.id, true));
    const archived = await repo.classes.get(A.teacher.id, c.id);
    assert.ok(archived!.archivedAt, "deveria estar arquivada");
    assert.equal(await count(`SELECT count(*) AS n FROM lessons WHERE id = $1`, [l.id]), 1);
    await repo.withScope(A.teacher.id, (r) => r.classes.setArchived(c.id, false));
    assert.equal((await repo.classes.get(A.teacher.id, c.id))!.archivedAt, "");
  });

  test("turma arquivada não serve de destino para envio", async () => {
    const c = await makeClass("Turma 2");
    await repo.withScope(A.teacher.id, (r) => r.classes.setArchived(c.id, true));
    const res = await repo.withScope(A.teacher.id, (r) => services.resolveTargets(r, [`turma:${c.id}`]));
    assert.equal(res.studentIds.size, 0);
    assert.equal(res.classId, "");
    await repo.withScope(A.teacher.id, (r) => r.classes.setArchived(c.id, false));
    const active = await repo.withScope(A.teacher.id, (r) => services.resolveTargets(r, [`turma:${c.id}`]));
    assert.deepEqual([...active.studentIds], [A.student.id]);
  });

  test("exclusão é bloqueada quando há aula realizada", async () => {
    const c = await makeClass("Turma 3");
    await makeLesson(c.id, "done", -1);
    const res = await repo.withScope(A.teacher.id, (r) => flows.deleteClassTx(r, c.id));
    assert.deepEqual(res, { error: "has_done_lessons" });
    assert.equal(await count(`SELECT count(*) AS n FROM classes WHERE id = $1`, [c.id]), 1);
  });

  test("exclusão sem aula realizada apaga as aulas agendadas e avisa os alunos", async () => {
    const c = await makeClass("Turma 4");
    const l = await makeLesson(c.id, "scheduled", 2);
    const before = await count(`SELECT count(*) AS n FROM notifications WHERE user_id = $1 AND text LIKE '%cancelada%'`, [A.studentUser.id]);
    const res = await repo.withScope(A.teacher.id, (r) => flows.deleteClassTx(r, c.id));
    assert.deepEqual(res, { ok: true });
    assert.equal(await count(`SELECT count(*) AS n FROM classes WHERE id = $1`, [c.id]), 0);
    assert.equal(await count(`SELECT count(*) AS n FROM lessons WHERE id = $1`, [l.id]), 0);
    assert.equal(await count(`SELECT count(*) AS n FROM notifications WHERE user_id = $1 AND text LIKE '%cancelada%'`, [A.studentUser.id]), before + 1);
  });

  test("a FK RESTRICT impede apagar por SQL uma turma que tenha aulas", async () => {
    const c = await makeClass("Turma 5");
    await makeLesson(c.id, "scheduled", 1);
    await assert.rejects(
      repo.withScope(A.teacher.id, (r) => r.db.query(`DELETE FROM classes WHERE id = $1`, [c.id])),
      // 23001 = restrict_violation (RESTRICT); 23503 = foreign_key_violation
      (err: { code?: string }) => err.code === "23001" || err.code === "23503"
    );
  });
});
