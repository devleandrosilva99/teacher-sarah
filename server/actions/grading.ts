"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { assignments, students, submissions } from "@/server/db/repo";
import { withTotals } from "@/server/services/assignments";
import { notify } from "@/server/services/notify";

export async function saveGrading(submissionId: string, formData: FormData): Promise<void> {
  const { teacher } = await requireTeacher();
  const sub = await submissions.get(teacher.id, submissionId);
  if (!sub || sub.status === "in_progress") return;
  const assignment = await assignments.get(teacher.id, sub.assignmentId);
  if (!assignment) return;

  const answers = { ...sub.answers };
  for (const q of assignment.questions) {
    const a = answers[q.id];
    if (!a) continue;
    const rawScore = String(formData.get(`score:${q.id}`) ?? "").replace(",", ".").trim();
    const feedback = String(formData.get(`feedback:${q.id}`) ?? "").trim().slice(0, 2000);
    let score = a.score;
    let auto = a.auto;
    if (rawScore !== "") {
      const n = Math.max(0, Math.min(a.maxScore, Number(rawScore)));
      if (!Number.isNaN(n) && n !== a.score) {
        score = Math.round(n * 100) / 100;
        auto = false;
      }
    }
    answers[q.id] = {
      ...a,
      score,
      auto,
      feedback,
      correct: score === null ? null : score >= a.maxScore,
    };
  }
  const before = sub.status;
  const updated = withTotals({
    ...sub,
    answers,
    generalFeedback: String(formData.get("generalFeedback") ?? "").trim().slice(0, 4000),
  });
  await submissions.put(updated);

  if (before !== "graded" && updated.status === "graded") {
    const st = await students.get(teacher.id, sub.studentId);
    await notify(st?.userId, `Sua atividade "${assignment.title}" foi corrigida.`, `/aluno/atividades/${assignment.id}/resultado?e=${sub.id}`);
  }
  revalidatePath("/professor", "layout");
  const next = String(formData.get("next") ?? "");
  if (next === "fila") {
    const pending = (await submissions.all(teacher.id)).filter((s) => s.status === "submitted" && s.id !== sub.id);
    redirect(pending[0] ? `/professor/correcao/${pending[0].id}` : "/professor/correcao?fim=1");
  }
  redirect(`/professor/correcao/${sub.id}?salvo=1`);
}
