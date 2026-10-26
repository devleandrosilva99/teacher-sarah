import "server-only";
import { withScope, type Repo } from "@/server/db/repo";
import { deleteObjectsAfterCommit, storage, storageKey, uploadsAvailable, type UploadTicket } from "@/server/storage";
import { deadlineFor } from "./assignments";
import { GRACE_MS, loadOwnAttempt } from "./flows";
import { MB, MEDIA_RULES, safeFileName, typesFor, type MediaKind } from "@/lib/files";
import type { Contents } from "@/lib/question-types";
import { newId } from "@/lib/format";
import type { StoredFile } from "@/lib/types";

// Arquivos: pedido de upload, confirmação, permissão de download e o vínculo
// com envios e entregas. Toda leitura passa pela RLS no escopo de quem pede.

export type FileViewer = { role: "teacher"; teacherId: string } | { role: "student"; teacherId: string; studentId: string };

const scopeOf = (v: FileViewer) => (v.role === "teacher" ? v.teacherId : { teacherId: v.teacherId, studentId: v.studentId });

export type UploadRequest =
  | { purpose: "question_media"; name: string; contentType: string; size: number }
  | { purpose: "submission"; name: string; contentType: string; size: number; submissionId: string; questionId: string };

export type UploadGrant = { fileId: string; ticket: UploadTicket } | { error: string };

function mediaKindOf(contentType: string): MediaKind | null {
  if (MEDIA_RULES.image.types.includes(contentType)) return "image";
  if (MEDIA_RULES.audio.types.includes(contentType)) return "audio";
  return null;
}

/** Tamanho máximo permitido para um arquivo, conforme a finalidade (o servidor decide). */
async function ruleFor(r: Repo, viewer: FileViewer, req: UploadRequest): Promise<{ maxBytes: number } | { error: string }> {
  if (req.purpose === "question_media") {
    if (viewer.role !== "teacher") return { error: "Sem permissão." };
    const kind = mediaKindOf(req.contentType);
    if (!kind) return { error: "Use uma imagem (JPG, PNG, WebP ou GIF) ou um áudio (MP3, M4A, OGG, WAV)." };
    return { maxBytes: MEDIA_RULES[kind].maxBytes };
  }
  if (viewer.role !== "student") return { error: "Sem permissão." };
  const own = await loadOwnAttempt(r, viewer.studentId, req.submissionId);
  if (!own || own.sub.status !== "in_progress") return { error: "Esta tentativa não está mais aberta." };
  const deadline = deadlineFor(own.assignment, own.sub);
  if (deadline && Date.now() > deadline + GRACE_MS) return { error: "O tempo acabou." };
  const q = own.assignment.questions.find((x) => x.id === req.questionId && x.type === "file_upload");
  if (!q) return { error: "Esta questão não aceita arquivos." };
  const c = q.content as Contents["file_upload"];
  if (!typesFor(c.accept).includes(req.contentType)) return { error: "Tipo de arquivo não aceito nesta questão." };
  const already = (await r.files.forSubmission(own.sub.id, q.id)).length;
  if (already >= c.maxFiles) return { error: `Esta questão aceita no máximo ${c.maxFiles} arquivo(s).` };
  return { maxBytes: c.maxMB * MB };
}

/**
 * Pedido de upload: valida permissão, tipo e tamanho, cria a linha "pending"
 * e devolve a autorização para o navegador enviar direto ao armazenamento.
 */
export async function requestUpload(viewer: FileViewer, req: UploadRequest): Promise<UploadGrant> {
  if (!uploadsAvailable()) return { error: "unavailable" };
  const size = Math.floor(Number(req.size) || 0);
  if (size <= 0) return { error: "Arquivo vazio." };
  const result = await withScope(scopeOf(viewer), async (r) => {
    const rule = await ruleFor(r, viewer, req);
    if ("error" in rule) return rule;
    if (size > rule.maxBytes) return { error: `O arquivo passa do limite de ${Math.round(rule.maxBytes / MB)} MB.` };
    const stale = await r.files.takeStalePending();
    const id = newId();
    const key = storageKey(viewer.teacherId, req.purpose, id);
    await r.files.create({
      id,
      teacherId: viewer.teacherId,
      uploadedBy: viewer.role,
      purpose: req.purpose,
      studentId: viewer.role === "student" ? viewer.studentId : "",
      submissionId: req.purpose === "submission" ? req.submissionId : "",
      questionId: req.purpose === "submission" ? req.questionId : "",
      storageKey: key,
      originalName: safeFileName(req.name),
      contentType: req.contentType,
      sizeBytes: size,
    });
    return { id, key, maxBytes: rule.maxBytes, stale };
  });
  if ("error" in result) return { error: result.error };
  await deleteObjectsAfterCommit(result.stale, "uploads pendentes antigos");
  const ticket = await storage().createUpload({ fileId: result.id, key: result.key, contentType: req.contentType, maxBytes: result.maxBytes });
  return { fileId: result.id, ticket };
}

/**
 * Confirmação: confere no armazenamento o tamanho e o tipo reais. Se não
 * baterem com o permitido, o arquivo é apagado; senão, fica "ready".
 */
export async function confirmUpload(viewer: FileViewer, fileId: string): Promise<{ file: StoredFile } | { error: string }> {
  const found = await withScope(scopeOf(viewer), (r) => r.files.get(fileId));
  if (!found || found.status !== "pending" || found.uploadedBy !== viewer.role) return { error: "Arquivo não encontrado." };
  const real = await storage().head(found.storageKey);
  const res = await withScope(scopeOf(viewer), async (r): Promise<{ error: string; discard: string[] } | { file: StoredFile }> => {
    // O limite é recalculado agora (para a entrega, pela questão e com a tentativa ainda aberta).
    const rule =
      found.purpose === "question_media"
        ? { maxBytes: MEDIA_RULES[mediaKindOf(found.contentType) ?? "image"].maxBytes }
        : await ruleForExisting(r, viewer, found);
    const problem =
      "error" in rule
        ? rule.error
        : !real || real.size === 0
          ? "O envio não terminou. Tente de novo."
          : real.size > rule.maxBytes
            ? `O arquivo passa do limite de ${Math.round(rule.maxBytes / MB)} MB.`
            : real.contentType !== found.contentType
              ? "O tipo do arquivo enviado não confere."
              : null;
    if (problem) {
      await r.files.remove(found.id);
      return { error: problem, discard: real ? [found.storageKey] : [] };
    }
    await r.files.markReady(found.id, real!.size, real!.contentType);
    return { file: { ...found, status: "ready" as const, sizeBytes: real!.size } };
  });
  if ("error" in res) {
    await deleteObjectsAfterCommit(res.discard, "upload recusado na confirmação");
    return { error: res.error };
  }
  return res;
}

async function ruleForExisting(r: Repo, viewer: FileViewer, f: StoredFile): Promise<{ maxBytes: number } | { error: string }> {
  if (viewer.role !== "student") return { error: "Sem permissão." };
  const own = await loadOwnAttempt(r, viewer.studentId, f.submissionId);
  if (!own || own.sub.status !== "in_progress") return { error: "Esta tentativa não está mais aberta." };
  const q = own.assignment.questions.find((x) => x.id === f.questionId && x.type === "file_upload");
  if (!q) return { error: "Esta questão não aceita arquivos." };
  return { maxBytes: (q.content as Contents["file_upload"]).maxMB * MB };
}

/** O aluno tira um arquivo da entrega enquanto a tentativa está aberta. */
export async function removeSubmissionFile(viewer: FileViewer, fileId: string): Promise<{ ok: true } | { error: string }> {
  if (viewer.role !== "student") return { error: "Sem permissão." };
  const res = await withScope(scopeOf(viewer), async (r): Promise<{ error: string } | { key: string }> => {
    const f = await r.files.get(fileId);
    if (!f || f.uploadedBy !== "student" || f.studentId !== viewer.studentId) return { error: "Arquivo não encontrado." };
    const own = f.submissionId ? await loadOwnAttempt(r, viewer.studentId, f.submissionId) : null;
    if (!own || own.sub.status !== "in_progress") return { error: "A entrega já foi enviada." };
    await r.files.remove(f.id);
    return { key: f.storageKey };
  });
  if ("error" in res) return res;
  await deleteObjectsAfterCommit([res.key], "arquivo retirado da entrega");
  return { ok: true };
}

/**
 * Apaga uma mídia do professor. Recusa se algum envio usa a mídia (a FK
 * RESTRICT de assignment_files também impede) ou se uma questão/texto ainda
 * aponta para ela.
 */
export async function deleteTeacherMedia(teacherId: string, fileId: string): Promise<{ ok: true } | { error: "not_found" | "in_use" }> {
  const res = await withScope(teacherId, async (r): Promise<{ error: "not_found" | "in_use" } | { key: string }> => {
    const f = await r.files.get(fileId);
    if (!f || f.purpose !== "question_media") return { error: "not_found" as const };
    if ((await r.files.linkedAssignmentCount(f.id)) > 0) return { error: "in_use" as const };
    const used = await r.db.one(
      `SELECT 1 FROM questions WHERE media_url LIKE $1 UNION ALL SELECT 1 FROM passages WHERE audio_url LIKE $1 LIMIT 1`,
      [`/arquivos/${f.id}%`]
    );
    if (used) return { error: "in_use" as const };
    await r.files.remove(f.id);
    return { key: f.storageKey };
  });
  if ("error" in res) return res;
  await deleteObjectsAfterCommit([res.key], "mídia excluída");
  return { ok: true };
}

/** Metadados do arquivo se quem pede pode vê-lo (senão null: a rota responde 404). */
export async function fileForViewer(viewer: FileViewer | null, fileId: string): Promise<StoredFile | null> {
  if (!viewer) return null;
  const f = await withScope(scopeOf(viewer), (r) => r.files.get(fileId));
  return f && f.status === "ready" ? f : null;
}
