import "server-only";
import { passages, questions } from "@/server/db/repo";
import type { PickerQuestion } from "@/components/teacher/ActivityBuilder";

/** Questões disponíveis para montar atividades (sem gabarito). */
export async function pickerData(teacherId: string, include: string[] = []) {
  const [qs, ps] = await Promise.all([questions.all(teacherId), passages.all(teacherId)]);
  const keep = new Set(include);
  const bank: PickerQuestion[] = qs
    .filter((q) => q.status === "published" || keep.has(q.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((q) => ({ id: q.id, prompt: q.prompt, type: q.type, skill: q.skill, level: q.level, points: q.points, passageId: q.passageId, tags: q.tags }));
  const usedPassages = new Set(bank.map((q) => q.passageId).filter(Boolean));
  return {
    bank,
    passages: ps.filter((p) => usedPassages.has(p.id)).map((p) => ({ id: p.id, title: p.title })),
  };
}
