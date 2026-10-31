import { notFound } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { assignments, students, submissions, withScope } from "@/server/db/repo";
import { fileInfoMap } from "@/lib/files";
import { saveGrading } from "@/server/actions/grading";
import AnswerReview from "@/components/questions/AnswerReview";
import SubmitButton from "@/components/SubmitButton";
import { Badge, Card, Notice, PageHeader, Textarea, scoreVariant } from "@/components/ui";
import { formatDateTime, percent } from "@/lib/format";

export const metadata = { title: "Corrigir" };

export default async function CorrigirPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  const { salvo } = await searchParams;
  const sub = await submissions.get(teacher.id, id);
  if (!sub) notFound();
  const [assignment, student] = await Promise.all([assignments.get(teacher.id, sub.assignmentId), students.get(teacher.id, sub.studentId)]);
  if (!assignment) notFound();
  const pByID = new Map(assignment.passages.map((p) => [p.id, p]));
  const files = fileInfoMap(await withScope(teacher.id, (r) => r.files.forSubmission(sub.id)));
  const inProgress = sub.status === "in_progress";
  const pct = percent(sub.score, sub.maxScore);

  return (
    <>
      <PageHeader
        title={student?.name ?? "Aluno"}
        back={{ href: "/professor/correcao", label: "Correção" }}
        subtitle={`${assignment.title} · tentativa ${sub.attempt}${sub.submittedAt ? ` · entregue ${formatDateTime(sub.submittedAt)}` : ""}`}
        actions={
          <>
            {sub.late && <Badge variant="warning">Entregue com atraso</Badge>}
            {sub.status === "graded" ? <Badge variant={scoreVariant(pct)}>Nota: {sub.score}/{sub.maxScore} ({pct}%)</Badge> : !inProgress && <Badge variant="purple">Aguardando correção</Badge>}
          </>
        }
      />
      {salvo && <div className="mb-4"><Notice variant="success">Correção salva.</Notice></div>}
      {inProgress ? (
        <Notice>O aluno ainda está fazendo esta atividade.</Notice>
      ) : (
        <form action={saveGrading.bind(null, sub.id)} className="flex flex-col gap-3">
          {assignment.questions.map((q, i) => {
            const a = sub.answers[q.id];
            return (
              <AnswerReview key={q.id} index={i + 1} question={q} answer={a} showKey passage={q.passageId ? pByID.get(q.passageId) : undefined} files={files}>
                <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-start">
                  <label className="flex items-center gap-2 text-xs text-ink-2">
                    Nota
                    <input
                      name={`score:${q.id}`}
                      type="number"
                      min={0}
                      max={q.activityPoints}
                      step={0.25}
                      defaultValue={a?.score ?? ""}
                      required={a?.score === null}
                      className={`w-20 rounded-md border px-2 py-1 text-sm ${a?.score === null ? "border-violet" : "border-line"}`}
                    />
                    / {q.activityPoints}
                    {a && !a.auto && a.score !== null && <span className="text-ink-3">(manual)</span>}
                  </label>
                  <textarea
                    name={`feedback:${q.id}`}
                    defaultValue={a?.feedback ?? ""}
                    placeholder="Comentário para o aluno (opcional)"
                    maxLength={2000}
                    className="min-h-9 flex-1 rounded-md border border-line px-2 py-1.5 text-sm"
                  />
                </div>
              </AnswerReview>
            );
          })}
          <Card>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-2">Comentário geral</span>
              <Textarea name="generalFeedback" defaultValue={sub.generalFeedback} maxLength={4000} className="min-h-16" />
            </label>
          </Card>
          <div className="flex flex-wrap gap-2">
            <SubmitButton name="next" value="fila">Salvar e ir para a próxima</SubmitButton>
            <SubmitButton variant="secondary" name="next" value="">Salvar</SubmitButton>
          </div>
        </form>
      )}
    </>
  );
}
