import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/server/auth/session";
import { assignments, submissions } from "@/server/db/repo";
import { deadlineFor, publicQuestionsFor, rowFor } from "@/server/services/assignments";
import ActivityPlayer from "@/components/student/ActivityPlayer";

export const metadata = { title: "Fazendo atividade" };

export default async function FazerPage({ params }: { params: Promise<{ id: string }> }) {
  const { student, scope } = await requireStudent();
  const { id } = await params;
  const a = await assignments.get(scope, id);
  if (!a || !a.studentIds.includes(student.id)) notFound();
  const row = rowFor(a, student.id, await submissions.all(scope));
  if (!row.current) redirect(`/aluno/atividades/${id}`);
  const sub = row.current;

  // Só o conteúdo público vai para o navegador: nada de gabarito.
  const questions = publicQuestionsFor(a, sub.id);
  return (
    <ActivityPlayer
      submissionId={sub.id}
      title={a.title}
      instructions={a.instructions}
      questions={questions}
      passages={a.passages}
      initial={sub.responses as Record<string, Record<string, unknown>>}
      deadline={deadlineFor(a, sub)}
    />
  );
}
