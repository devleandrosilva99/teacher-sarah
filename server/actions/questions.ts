"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { isUuid, withScope } from "@/server/db/repo";
import { buildQuestion, typeAllowed } from "@/lib/question-types";
import { QUESTION_TYPES, type Passage, type Question } from "@/lib/types";
import { newId, nowIso } from "@/lib/format";
import { fileIdFromUrl } from "@/lib/files";
import type { FormState } from "./state";

const url = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v) || fileIdFromUrl(v) !== null, "O link da mídia precisa começar com http:// ou https://.");

const QuestionSchema = z.object({
  id: z.string().default(""),
  subjectId: z.string().default(""),
  type: z.enum(QUESTION_TYPES),
  prompt: z.string().trim().min(1, "Escreva o enunciado.").max(4000),
  instructions: z.string().trim().max(1000).default(""),
  mediaUrl: url.default(""),
  passageId: z.string().default(""),
  level: z.string().default(""),
  skill: z.string().min(1, "Escolha a habilidade."),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  points: z.coerce.number().min(0.5, "A pontuação mínima é 0,5.").max(100),
  explanation: z.string().trim().max(2000).default(""),
  status: z.enum(["draft", "published"]),
  source: z.unknown(),
  next: z.string().default(""),
});

export async function saveQuestion(_prev: FormState, formData: FormData): Promise<FormState> {
  const { teacher } = await requireTeacher();
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Não foi possível ler a questão." };
  }
  const parsed = QuestionSchema.safeParse({ ...(raw as object), status: formData.get("status") === "draft" ? "draft" : "published" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const built = buildQuestion(d.type, d.source);
  if (!built.ok) return { error: built.error };

  const result = await withScope(teacher.id, async (r) => {
    const existing = d.id ? await r.questions.get(d.id) : null;
    if (d.id && !existing) return { error: "Questão não encontrada." };
    const subject = await r.subjects.get(d.subjectId);
    if (!subject) return { error: "Escolha a disciplina." };
    if (existing && existing.type !== d.type) return { error: "O tipo da questão não pode mudar." };
    if (!typeAllowed(d.type, subject.templateKey)) return { error: "Este tipo de questão não está disponível nesta disciplina." };
    if (!subject.skills.some((k) => k.key === d.skill)) return { error: "Habilidade inválida para esta disciplina." };
    if (d.level && !subject.levels.some((l) => l.code === d.level)) return { error: "Nível inválido para esta disciplina." };
    if (d.passageId) {
      const p = await r.passages.get(d.passageId);
      if (!p) return { error: "Texto de leitura não encontrado." };
      if (p.subjectId !== subject.id) return { error: "O texto de leitura é de outra disciplina." };
    }
    const q: Question = {
      id: existing?.id ?? newId(),
      teacherId: teacher.id,
      subjectId: subject.id,
      type: d.type,
      prompt: d.prompt,
      instructions: d.instructions,
      mediaUrl: d.mediaUrl,
      passageId: d.passageId,
      level: d.level,
      skill: d.skill,
      tags: Array.from(new Set(d.tags.map((t) => t.toLowerCase()))),
      points: d.points,
      explanation: d.explanation,
      status: d.status,
      source: built.source,
      content: built.content,
      answerKey: built.answerKey,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    return r.questions.put(q);
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/professor/questoes");
  revalidatePath("/professor/leituras", "layout");
  const next = d.next.startsWith("/professor/") ? d.next : "";
  redirect(next || `/professor/questoes?salva=${result.id}`);
}

export async function duplicateQuestion(id: string): Promise<void> {
  const { teacher } = await requireTeacher();
  const copy = await withScope(teacher.id, async (r) => {
    const q = await r.questions.get(id);
    if (!q) return null;
    return r.questions.put({ ...q, id: newId(), prompt: `${q.prompt} (cópia)`, status: "draft", createdAt: nowIso(), updatedAt: nowIso() });
  });
  if (copy) redirect(`/professor/questoes/${copy.id}`);
}

export async function setQuestionStatus(id: string, status: Question["status"]): Promise<void> {
  const { teacher } = await requireTeacher();
  await withScope(teacher.id, async (r) => {
    const q = await r.questions.get(id);
    if (q) await r.questions.put({ ...q, status, updatedAt: nowIso() });
  });
  revalidatePath("/professor/questoes");
}

// ---------- textos de leitura / áudio ----------

const PassageSchema = z.object({
  subjectId: z.string().default(""),
  title: z.string().trim().min(1, "Dê um título ao texto.").max(150),
  kind: z.enum(["reading", "listening"]),
  text: z.string().trim().max(20000).default(""),
  audioUrl: url.default(""),
  source: z.string().trim().max(200).default(""),
  level: z.string().default(""),
});

export async function savePassage(_prev: FormState, formData: FormData): Promise<FormState> {
  const { teacher } = await requireTeacher();
  const raw = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = PassageSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", fields: raw };
  const d = parsed.data;
  if (d.kind === "reading" && !d.text) return { error: "Escreva o texto de leitura.", fields: raw };
  if (d.kind === "listening" && !d.audioUrl) return { error: "Informe o link do áudio.", fields: raw };
  const id = String(formData.get("id") ?? "");
  const result = await withScope(teacher.id, async (r) => {
    const subject = await r.subjects.get(d.subjectId);
    if (!subject) return { error: "Escolha a disciplina." };
    if (d.level && !subject.levels.some((l) => l.code === d.level)) return { error: "Nível inválido para esta disciplina." };
    const existing = id ? await r.passages.get(id) : null;
    // Trocar a disciplina de um texto que já tem questões quebraria o vínculo.
    if (existing && existing.subjectId !== subject.id && (await r.questions.all()).some((q) => q.passageId === existing.id)) {
      return { error: "Este texto já tem questões; a disciplina não pode mudar." };
    }
    const p: Passage = {
      ...d,
      id: existing?.id ?? newId(),
      teacherId: teacher.id,
      subjectId: subject.id,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    return r.passages.put(p);
  });
  if ("error" in result) return { error: result.error, fields: raw };
  revalidatePath("/professor/leituras");
  redirect(`/professor/leituras/${result.id}`);
}

export async function deletePassage(id: string): Promise<void> {
  const { teacher } = await requireTeacher();
  // As questões perdem o vínculo (ON DELETE SET NULL) e continuam no banco.
  if (isUuid(id)) await withScope(teacher.id, (r) => r.passages.remove(id));
  revalidatePath("/professor/leituras");
  redirect("/professor/leituras");
}
