import { notFound } from "next/navigation";
import { requireStudent } from "@/server/auth/session";
import { assignments, submissions } from "@/server/db/repo";
import { canSeeAnswers, rowFor } from "@/server/services/assignments";
import AnswerReview from "@/components/questions/AnswerReview";
import { ButtonLink, Card, Notice, PageHeader } from "@/components/ui";
import { formatDateTime, percent } from "@/lib/format";
import { SHOW_ANSWERS_LABELS } from "@/lib/labels";

export const metadata = { title: "Resultado" };

export default async function ResultadoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string }> }) {
  const { student, scope } = await requireStudent();
  const { id } = await params;
  const { e } = await searchParams;
  const a = await assignments.get(scope, id);
  if (!a || !a.studentIds.includes(student.id)) notFound();
  const subs = await submissions.all(scope);
  const row = rowFor(a, student.id, subs);
  const sub = row.attempts.find((s) => s.id === e && s.status !== "in_progress") ?? row.best;
  if (!sub || sub.status === "in_progress") notFound();

  const graded = sub.status === "graded";
  const showKey = canSeeAnswers(row);
  const pct = percent(sub.score, sub.maxScore);
  const pById = new Map(a.passages.map((p) => [p.id, p]));

  return (
    <>
      <PageHeader title={a.title} subtitle={`Tentativa ${sub.attempt} · entregue ${formatDateTime(sub.submittedAt)}`} back={{ href: `/aluno/atividades/${id}`, label: "Voltar" }} />
      <Card className="mb-4 text-center">
        {graded ? (
          <>
            <div className="text-xs text-ink-2">Sua nota</div>
            <div className="mt-1 text-4xl font-semibold">{pct}%</div>
            <div className="text-sm text-ink-2">{sub.score} de {sub.maxScore} pontos</div>
          </>
        ) : (
          <>
            <div className="text-lg font-medium">Entrega recebida!</div>
            <p className="mt-1 text-sm text-ink-2">
              Parte das respostas é corrigida pelo professor. Você recebe um aviso quando a nota sair.
              {sub.score > 0 && ` Até agora: ${sub.score} pontos nas questões corrigidas automaticamente.`}
            </p>
          </>
        )}
        {sub.generalFeedback && (
          <p className="mx-auto mt-4 max-w-lg rounded-lg bg-brand-soft px-3 py-2 text-left text-sm text-brand-ink">
            <span className="block text-xs font-medium">Comentário do professor</span>
            {sub.generalFeedback}
          </p>
        )}
        {row.attemptsLeft > 0 && !row.current && (
          <ButtonLink href={`/aluno/atividades/${id}`} variant="secondary" className="mt-4">Tentar de novo</ButtonLink>
        )}
      </Card>
      {!showKey && (
        <div className="mb-4">
          <Notice>
            {a.showAnswers === "never"
              ? "Seu professor optou por não mostrar o gabarito desta atividade."
              : `O gabarito aparece ${a.showAnswers === "after_due" && a.dueAt ? `depois do prazo (${formatDateTime(a.dueAt)})` : row.attemptsLeft > 0 ? "quando você usar todas as tentativas" : SHOW_ANSWERS_LABELS[a.showAnswers].toLowerCase()}.`}
          </Notice>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {a.questions.map((q, i) => (
          <AnswerReview key={q.id} index={i + 1} question={q} answer={sub.answers[q.id]} showKey={showKey} passage={q.passageId ? pById.get(q.passageId) : undefined} />
        ))}
      </div>
    </>
  );
}
