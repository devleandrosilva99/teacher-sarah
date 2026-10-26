import "server-only";
import { withScope } from "@/server/db/repo";
import type { PickerQuestion } from "@/components/teacher/ActivityBuilder";

/** Questões disponíveis para montar atividades, por disciplina (sem gabarito). */
export async function pickerData(teacherId: string, include: string[] = []) {
  return withScope(teacherId, async (r) => {
    const qs = await r.questions.all();
    const ps = await r.passages.all();
    const keep = new Set(include);
    const bank: PickerQuestion[] = qs
      .filter((q) => q.status === "published" || keep.has(q.id))
      .map((q) => ({
        id: q.id,
        subjectId: q.subjectId,
        prompt: q.prompt,
        type: q.type,
        skill: q.skill,
        level: q.level,
        points: q.points,
        passageId: q.passageId,
        tags: q.tags,
      }));
    const usedPassages = new Set(bank.map((q) => q.passageId).filter(Boolean));
    return {
      bank,
      passages: ps.filter((p) => usedPassages.has(p.id)).map((p) => ({ id: p.id, title: p.title, subjectId: p.subjectId })),
    };
  });
}
