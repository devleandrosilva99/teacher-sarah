// Arquivos (Fase 2, item 5): isolamento da tabela files (RLS), permissão de
// download, validação de tipo e tamanho, vínculo das mídias com os envios e
// exclusão do aluno apagando os objetos (adaptador local).
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SKIP, setupSchema } from "./setup.mts";
import { makeTeacher, type TeacherFixture } from "./fixtures.mts";
import { buildQuestion } from "../../lib/question-types.ts";
import { newId, nowIso } from "../../lib/format.ts";
import { MB, fileUrl } from "../../lib/files.ts";
import type { Activity, Assignment, Question, Student, User } from "../../lib/types.ts";

describe("arquivos", { skip: SKIP }, () => {
  let env: Awaited<ReturnType<typeof setupSchema>>;
  let A: TeacherFixture;
  let B: TeacherFixture;
  let other: Student; // segundo aluno de A
  let repo: typeof import("../../server/db/repo.ts");
  let svc: typeof import("../../server/services/files.ts");
  let storage: typeof import("../../server/storage/index.ts");
  let flows: typeof import("../../server/services/flows.ts");
  let assignments: typeof import("../../server/services/assignments.ts");
  let uploadDir: string;
  let fileQuestion: Question;
  let asg: Assignment;
  let subId: string;

  const teacherA = () => ({ role: "teacher" as const, teacherId: A.teacher.id });
  const studentA = () => ({ role: "student" as const, teacherId: A.teacher.id, studentId: A.student.id });
  const otherA = () => ({ role: "student" as const, teacherId: A.teacher.id, studentId: other.id });
  const teacherB = () => ({ role: "teacher" as const, teacherId: B.teacher.id });
  const studentB = () => ({ role: "student" as const, teacherId: B.teacher.id, studentId: B.student.id });

  /** Faz o caminho completo: pedido, envio pela rota local (simulado) e confirmação. */
  async function upload(viewer: Parameters<typeof svc.requestUpload>[0], req: Parameters<typeof svc.requestUpload>[1], bytes = 1000) {
    const grant = await svc.requestUpload(viewer, req);
    if ("error" in grant) return grant;
    assert.equal(grant.ticket.kind, "local");
    const t = new URL(`http://x${grant.ticket.kind === "local" ? grant.ticket.url : ""}`).searchParams.get("t")!;
    const claims = await storage.verifyLocalUpload(t, grant.fileId);
    assert.ok(claims, "token local válido");
    const body = new Blob([new Uint8Array(bytes)]).stream();
    const written = await storage.writeLocalUpload(claims, body);
    if ("error" in written) return { error: written.error };
    return svc.confirmUpload(viewer, grant.fileId);
  }

  before(async () => {
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    process.env.UPLOAD_DIR = uploadDir;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.VERCEL;
    env = await setupSchema();
    repo = await import("../../server/db/repo.ts");
    svc = await import("../../server/services/files.ts");
    storage = await import("../../server/storage/index.ts");
    flows = await import("../../server/services/flows.ts");
    assignments = await import("../../server/services/assignments.ts");
    A = await makeTeacher("a");
    B = await makeTeacher("b");
    other = await repo.withScope(A.teacher.id, async (r) => {
      const u: User = { id: newId(), email: `outro-${A.teacher.id.slice(0, 6)}@teste.local`, passwordHash: "x", role: "student", name: "Outro", blocked: false, createdAt: nowIso() };
      await r.users.create(u);
      return r.students.put({ ...A.student, id: newId(), userId: u.id, name: "Outro", email: u.email });
    });
    // Atividade com uma questão de entrega de arquivo, enviada aos dois alunos de A.
    const built = buildQuestion("file_upload", { maxFiles: 2, maxMB: 1, accept: ["photo", "pdf"], rubric: "" });
    assert.ok(built.ok);
    fileQuestion = await repo.withScope(A.teacher.id, (r) =>
      r.questions.put({
        ...A.openQuestion, id: newId(), type: "file_upload", prompt: "Envie a foto do caderno", passageId: "",
        source: built.source, content: built.content, answerKey: built.answerKey,
      })
    );
    const activity: Activity = { ...A.activity, id: newId(), title: "Entrega", items: [{ questionId: fileQuestion.id, points: 5 }] };
    await repo.withScope(A.teacher.id, (r) => r.activities.put(activity));
    asg = await repo.withScope(A.teacher.id, (r) =>
      assignments.createAssignment(r, activity, { studentIds: [A.student.id, other.id], classId: "", releaseAt: nowIso(), dueAt: "" })
    );
    subId = newId();
    await repo.withScope({ teacherId: A.teacher.id, studentId: A.student.id }, (r) =>
      r.submissions.put({
        id: subId, teacherId: A.teacher.id, assignmentId: asg.id, studentId: A.student.id, attempt: 1, startedAt: nowIso(), submittedAt: "",
        late: false, status: "in_progress", responses: {}, answers: {}, score: 0, maxScore: 0, generalFeedback: "",
      })
    );
  });
  after(async () => {
    await env?.cleanup();
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  const sub = (extra: Record<string, unknown> = {}) => ({
    purpose: "submission" as const, name: "caderno.jpg", contentType: "image/jpeg", size: 1000, submissionId: subId, questionId: fileQuestion.id, ...extra,
  });

  test("validação de tipo e tamanho (o servidor decide)", async () => {
    assert.match(String((await svc.requestUpload(studentA(), sub({ contentType: "audio/mpeg", name: "a.mp3" })) as { error: string }).error), /não aceito/);
    assert.match(String((await svc.requestUpload(studentA(), sub({ size: 2 * MB })) as { error: string }).error), /limite/);
    assert.match(String((await svc.requestUpload(studentA(), sub({ size: 0 })) as { error: string }).error), /vazio/);
    assert.match(String((await svc.requestUpload(studentA(), sub({ questionId: A.question.id })) as { error: string }).error), /não aceita arquivos/);
    assert.match(String((await svc.requestUpload(otherA(), sub()) as { error: string }).error), /não está mais aberta/, "tentativa de outro aluno");
    assert.match(String((await svc.requestUpload(teacherA(), sub()) as { error: string }).error), /Sem permissão/, "professor não envia entrega");
    const media = { purpose: "question_media" as const, name: "x.svg", contentType: "image/svg+xml", size: 10 };
    assert.ok("error" in (await svc.requestUpload(teacherA(), media)), "SVG não é aceito");
    assert.ok("error" in (await svc.requestUpload(teacherA(), { ...media, contentType: "image/png", size: 6 * MB })), "imagem acima de 5 MB");
    assert.ok("error" in (await svc.requestUpload(studentA(), { ...media, contentType: "image/png" })), "aluno não envia mídia de questão");
  });

  test("o envio local não aceita mais bytes que o autorizado", async () => {
    const res = await upload(studentA(), sub(), 1 * MB + 1);
    assert.deepEqual(res, { error: "too_large" });
  });

  test("confirmação sem o arquivo no armazenamento é recusada e a linha sai", async () => {
    const grant = await svc.requestUpload(studentA(), sub());
    assert.ok("fileId" in grant);
    assert.match(String((await svc.confirmUpload(studentA(), grant.fileId) as { error: string }).error), /não terminou/);
    assert.equal(await repo.withScope(A.teacher.id, (r) => r.files.get(grant.fileId)), null);
  });

  let studentFileId = "";
  test("download: o aluno dono e o professor dele veem; outro aluno, outro professor e sem login recebem 404", async () => {
    const res = await upload(studentA(), sub());
    assert.ok("file" in res, JSON.stringify(res));
    studentFileId = res.file.id;
    assert.ok(await svc.fileForViewer(studentA(), studentFileId));
    assert.ok(await svc.fileForViewer(teacherA(), studentFileId));
    assert.equal(await svc.fileForViewer(otherA(), studentFileId), null, "outro aluno do mesmo professor");
    assert.equal(await svc.fileForViewer(teacherB(), studentFileId), null, "outro professor");
    assert.equal(await svc.fileForViewer(studentB(), studentFileId), null, "aluno de outro professor");
    assert.equal(await svc.fileForViewer(null, studentFileId), null, "sem login");
  });

  test("RLS com SQL cru: outro professor e outro aluno não enxergam a linha", async () => {
    const count = (scope: Parameters<typeof repo.withScope>[0]) =>
      repo.withScope(scope, (r) => r.db.one<{ n: number }>(`SELECT count(*)::int AS n FROM files WHERE id = $1`, [studentFileId]));
    assert.equal((await count(B.teacher.id))!.n, 0);
    assert.equal((await count({ teacherId: A.teacher.id, studentId: other.id }))!.n, 0);
    assert.equal((await count(A.teacher.id))!.n, 1);
    // Aluno não grava arquivo em nome de outro aluno.
    await assert.rejects(
      repo.withScope({ teacherId: A.teacher.id, studentId: other.id }, (r) =>
        r.db.query(`UPDATE files SET original_name = 'x' WHERE id = $1 RETURNING id`, [studentFileId]).then((rows) => {
          if (!rows.length) throw new Error("nenhuma linha");
        })
      )
    );
    await assert.rejects(
      repo.withScope({ teacherId: A.teacher.id, studentId: other.id }, (r) =>
        r.db.query(
          `INSERT INTO files (teacher_id, uploaded_by, purpose, student_id, submission_id, question_id, storage_key, original_name, content_type, size_bytes, status)
           VALUES ($1, 'student', 'submission', $2, $3, $4, 'k-forjada', 'x', 'image/png', 1, 'ready')`,
          [A.teacher.id, A.student.id, subId, fileQuestion.id]
        )
      ),
      (e: { code?: string }) => e.code === "42501"
    );
  });

  test("resposta só aceita arquivos do próprio aluno, desta entrega, até o limite", async () => {
    const res = await repo.withScope({ teacherId: A.teacher.id, studentId: A.student.id }, async (r) => {
      const s = (await r.submissions.get(subId))!;
      const a = (await r.assignments.get(asg.id))!;
      return flows.verifiedFileResponses(r, a, s, { [fileQuestion.id]: { fileIds: [studentFileId, studentFileId, newId(), "x"] } });
    });
    assert.deepEqual(res, { [fileQuestion.id]: { fileIds: [studentFileId] } });
  });

  test("limite de arquivos por questão", async () => {
    assert.ok("file" in (await upload(studentA(), sub())));
    assert.match(String((await svc.requestUpload(studentA(), sub()) as { error: string }).error), /no máximo 2/);
  });

  test("mídia do professor: o aluno só vê se estiver num envio dele já liberado", async () => {
    const res = await upload(teacherA(), { purpose: "question_media", name: "figura.png", contentType: "image/png", size: 500 }, 500);
    assert.ok("file" in res);
    const mediaId = res.file.id;
    assert.equal(await svc.fileForViewer(studentA(), mediaId), null, "ainda não está em envio nenhum");
    // Questão com a mídia, enviada só para o aluno A com liberação no futuro.
    const q = await repo.withScope(A.teacher.id, (r) => r.questions.put({ ...A.question, id: newId(), mediaUrl: fileUrl(mediaId, "image") }));
    const act: Activity = { ...A.activity, id: newId(), items: [{ questionId: q.id, points: 1 }] };
    await repo.withScope(A.teacher.id, (r) => r.activities.put(act));
    const future = await repo.withScope(A.teacher.id, (r) =>
      assignments.createAssignment(r, act, { studentIds: [A.student.id], classId: "", releaseAt: new Date(Date.now() + 86_400_000).toISOString(), dueAt: "" })
    );
    assert.equal(await svc.fileForViewer(studentA(), mediaId), null, "antes da liberação, não aparece");
    await env.admin.query(`UPDATE assignments SET release_at = now() - interval '1 minute' WHERE id = $1`, [future.id]);
    assert.ok(await svc.fileForViewer(studentA(), mediaId), "liberado: o aluno do envio vê");
    assert.equal(await svc.fileForViewer(otherA(), mediaId), null, "aluno fora do envio não vê");
    assert.equal(await svc.fileForViewer(teacherB(), mediaId), null);

    // Ligada a um envio, não pode ser apagada: nem pelo app, nem por SQL (RESTRICT).
    assert.deepEqual(await svc.deleteTeacherMedia(A.teacher.id, mediaId), { error: "in_use" });
    await assert.rejects(
      repo.withScope(A.teacher.id, (r) => r.db.query(`DELETE FROM files WHERE id = $1`, [mediaId])),
      (e: { code?: string }) => e.code === "23001" || e.code === "23503"
    );
  });

  test("mídia sem uso pode ser apagada (e o objeto sai do armazenamento)", async () => {
    const res = await upload(teacherA(), { purpose: "question_media", name: "som.mp3", contentType: "audio/mpeg", size: 300 }, 300);
    assert.ok("file" in res);
    const key = (await repo.withScope(A.teacher.id, (r) => r.files.get(res.file.id)))!.storageKey;
    assert.ok(fs.existsSync(path.join(uploadDir, ...key.split("/"))));
    assert.deepEqual(await svc.deleteTeacherMedia(A.teacher.id, res.file.id), { ok: true });
    assert.ok(!fs.existsSync(path.join(uploadDir, ...key.split("/"))));
    assert.deepEqual(await svc.deleteTeacherMedia(B.teacher.id, res.file.id), { error: "not_found" });
  });

  test("excluir o aluno apaga os metadados e os objetos dos arquivos dele", async () => {
    const mine = await repo.withScope(A.teacher.id, (r) => r.files.forStudent(A.student.id));
    const keys = mine.map((f) => f.storageKey);
    const ready = mine.filter((f) => f.status === "ready").map((f) => f.storageKey);
    assert.ok(ready.length >= 2);
    for (const k of ready) assert.ok(fs.existsSync(path.join(uploadDir, ...k.split("/"))));
    const deleted = await repo.withScope(A.teacher.id, (r) => flows.deleteStudentTx(r, A.student.id));
    assert.deepEqual(deleted?.storageKeys.sort(), keys.sort());
    await storage.deleteObjectsAfterCommit(deleted!.storageKeys, "teste");
    for (const k of keys) assert.ok(!fs.existsSync(path.join(uploadDir, ...k.split("/"))), `objeto ${k} apagado`);
    assert.equal(Number((await env.admin.query(`SELECT count(*) AS n FROM files WHERE student_id = $1`, [A.student.id])).rows[0].n), 0);
  });
});
