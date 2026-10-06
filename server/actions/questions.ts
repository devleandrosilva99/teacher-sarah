"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { passages, questions } from "@/server/db/repo";
import { buildQuestion } from "@/lib/question-types";
import { LEVELS, QUESTION_TYPES, SKILLS, type Passage, type Question } from "@/lib/types";
import { newId, nowIso } from "@/lib/format";
import type { FormState } from "./state";

const url = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "O link da mídia precisa começar com http:// ou https://.");

const QuestionSchema = z.object({
  id: z.string().default(""),
  type: z.enum(QUESTION_TYPES),
  prompt: z.string().trim().min(1, "Escreva o enunciado.").max(4000),
  instructions: z.string().trim().max(1000).default(""),
  mediaUrl: url.default(""),
  passageId: z.string().default(""),
  level: z.union([z.enum(LEVELS), z.literal("")]).default(""),
  skill: z.enum(SKILLS),
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

  if (d.passageId && !(await passages.get(teacher.id, d.passageId))) return { error: "Texto de leitura não encontrado." };
  const built = buildQuestion(d.type, d.source);
  if (!built.ok) return { error: built.error };

  const existing = d.id ? await questions.get(teacher.id, d.id) : null;
  if (d.id && !existing) return { error: "Questão não encontrada." };

  const q: Question = {
    id: existing?.id ?? newId(),
    teacherId: teacher.id,
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
  await questions.put(q);
  revalidatePath("/professor/questoes");
  revalidatePath("/professor/leituras", "layout");
  const next = d.next.startsWith("/professor/") ? d.next : "";
  redirect(next || `/professor/questoes?salva=${q.id}`);
}

export async function duplicateQuestion(id: string): Promise<void> {
  const { teacher } = await requireTeacher();
  const q = await questions.get(teacher.id, id);
  if (!q) return;
  const copy = { ...q, id: newId(), prompt: `${q.prompt} (cópia)`, status: "draft" as const, createdAt: nowIso(), updatedAt: nowIso() };
  await questions.put(copy);
  redirect(`/professor/questoes/${copy.id}`);
}

export async function setQuestionStatus(id: string, status: Question["status"]): Promise<void> {
  const { teacher } = await requireTeacher();
  const q = await questions.get(teacher.id, id);
  if (!q) return;
  await questions.put({ ...q, status, updatedAt: nowIso() });
  revalidatePath("/professor/questoes");
}

// ---------- textos de leitura / áudio ----------

const PassageSchema = z.object({
  title: z.string().trim().min(1, "Dê um título ao texto.").max(150),
  kind: z.enum(["reading", "listening"]),
  text: z.string().trim().max(20000).default(""),
  audioUrl: url.default(""),
  source: z.string().trim().max(200).default(""),
  level: z.union([z.enum(LEVELS), z.literal("")]).default(""),
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
  const existing = id ? await passages.get(teacher.id, id) : null;
  const p: Passage = {
    ...d,
    id: existing?.id ?? newId(),
    teacherId: teacher.id,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  await passages.put(p);
  revalidatePath("/professor/leituras");
  redirect(`/professor/leituras/${p.id}`);
}

export async function deletePassage(id: string): Promise<void> {
  const { teacher } = await requireTeacher();
  for (const q of await questions.all(teacher.id)) {
    if (q.passageId === id) await questions.put({ ...q, passageId: "", updatedAt: nowIso() });
  }
  await passages.remove(teacher.id, id);
  revalidatePath("/professor/leituras");
  redirect("/professor/leituras");
}
