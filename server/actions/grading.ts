"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { withScope } from "@/server/db/repo";
import { gradeAttemptTx } from "@/server/services/flows";

export async function saveGrading(submissionId: string, formData: FormData): Promise<void> {
  const { teacher } = await requireTeacher();
  const scores: Record<string, string> = {};
  const feedback: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("score:")) scores[k.slice(6)] = String(v);
    if (k.startsWith("feedback:")) feedback[k.slice(9)] = String(v);
  }
  // Notas e notificação numa transação, com a tentativa travada (FOR UPDATE).
  const saved = await withScope(teacher.id, async (r) => {
    const updated = await gradeAttemptTx(r, submissionId, { scores, feedback, general: String(formData.get("generalFeedback") ?? "") });
    if (!updated) return null;
    const pending = (await r.submissions.all()).filter((s) => s.status === "submitted" && s.id !== updated.id);
    return { id: updated.id, nextPending: pending[0]?.id ?? "" };
  });
  if (!saved) return;
  revalidatePath("/professor", "layout");
  if (String(formData.get("next") ?? "") === "fila") {
    redirect(saved.nextPending ? `/professor/correcao/${saved.nextPending}` : "/professor/correcao?fim=1");
  }
  redirect(`/professor/correcao/${saved.id}?salvo=1`);
}
