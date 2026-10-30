"use server";

import { requireStudent, requireTeacher } from "@/server/auth/session";
import { confirmUpload, deleteTeacherMedia, removeSubmissionFile, requestUpload, type FileViewer, type UploadGrant, type UploadRequest } from "@/server/services/files";
import { UPLOADS_UNAVAILABLE } from "@/server/storage";
import { fileUrl, type MediaKind } from "@/lib/files";
import { MEDIA_RULES } from "@/lib/files";

// Ações chamadas pelo componente de upload. O papel vem da sessão, nunca do
// navegador: o professor só envia mídias; o aluno só entregas dele.

async function teacherViewer(): Promise<FileViewer> {
  const { teacher } = await requireTeacher();
  return { role: "teacher", teacherId: teacher.id };
}

async function studentViewer(): Promise<FileViewer> {
  const { scope } = await requireStudent();
  return { role: "student", ...scope };
}

const friendly = (g: UploadGrant): UploadGrant => ("error" in g && g.error === "unavailable" ? { error: UPLOADS_UNAVAILABLE } : g);

export async function requestMediaUpload(name: string, contentType: string, size: number): Promise<UploadGrant> {
  return friendly(await requestUpload(await teacherViewer(), { purpose: "question_media", name, contentType, size }));
}

export async function confirmMediaUpload(fileId: string): Promise<{ url: string } | { error: string }> {
  const res = await confirmUpload(await teacherViewer(), fileId);
  if ("error" in res) return res;
  const media: MediaKind = MEDIA_RULES.audio.types.includes(res.file.contentType) ? "audio" : "image";
  return { url: fileUrl(res.file.id, media) };
}

export async function deleteMedia(fileId: string): Promise<{ ok: true } | { error: string }> {
  const { teacher } = await requireTeacher();
  const res = await deleteTeacherMedia(teacher.id, fileId);
  if ("error" in res) return { error: res.error === "in_use" ? "Este arquivo está em uso por uma questão, texto ou envio." : "Arquivo não encontrado." };
  return res;
}

export async function requestSubmissionUpload(input: Omit<Extract<UploadRequest, { purpose: "submission" }>, "purpose">): Promise<UploadGrant> {
  return friendly(
    await requestUpload(await studentViewer(), {
      purpose: "submission",
      name: String(input.name ?? ""),
      contentType: String(input.contentType ?? ""),
      size: Number(input.size),
      submissionId: String(input.submissionId ?? ""),
      questionId: String(input.questionId ?? ""),
    })
  );
}

export async function confirmSubmissionUpload(fileId: string): Promise<{ file: { id: string; name: string; size: number; contentType: string } } | { error: string }> {
  const res = await confirmUpload(await studentViewer(), fileId);
  if ("error" in res) return res;
  return { file: { id: res.file.id, name: res.file.originalName, size: res.file.sizeBytes, contentType: res.file.contentType } };
}

export async function removeSubmissionUpload(fileId: string): Promise<{ ok: true } | { error: string }> {
  return removeSubmissionFile(await studentViewer(), fileId);
}
