import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/server/auth/session";
import { assignments, submissions } from "@/server/db/repo";
import { rowFor } from "@/server/services/assignments";
import { startAttempt } from "@/server/actions/student";
import SubmitButton from "@/components/SubmitButton";
import { Badge, Card, Notice, PageHeader, scoreVariant } from "@/components/ui";
import { ASSIGNMENT_STATUS } from "@/lib/labels";
import { formatDateTime, percent } from "@/lib/format";

export default async function AtividadeAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { student, teacher } = await requireStudent();
  const { id } = await params;
  const a = await assignments.get(teacher.id, id);
  if (!a || !a.studentIds.includes(student.id) || new Date(a.releaseAt).getTime() > Date.now()) notFound();
  const row = rowFor(a, student.id, await submissions.all(teacher.id));
  const total = a.questions.reduce((s, q) => s + q.activityPoints, 0);
  const st = ASSIGNMENT_STATUS[row.status];
  const finished = row.attempts.filter((s) => s.status !== "in_progress");

  return (
    <>
      <PageHeader title={a.title} back={{ href: "/aluno/atividades", label: "Atividades" }} actions={<Badge variant={st.variant}>{st.label}</Badge>} />
      <Card className="mb-4">
        {a.instructions && <p className="mb-3 whitespace-pre-wrap text-sm">{a.instructions}</p>}
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-ink-3">Questões</dt><dd>{a.questions.length}</dd></div>
          <div><dt className="text-xs text-ink-3">Pontos</dt><dd>{total}</dd></div>
          <div><dt className="text-xs text-ink-3">Tempo</dt><dd>{a.timeLimitMin ? `${a.timeLimitMin} min` : "Livre"}</dd></div>
          <div><dt className="text-xs text-ink-3">Prazo</dt><dd>{a.dueAt ? formatDateTime(a.dueAt) : "Sem prazo"}</dd></div>
        </dl>
        <div className="mt-4">
          {row.current ? (
            <Link href={`/aluno/atividades/${id}/fazer`} className="inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Continuar</Link>
          ) : row.attemptsLeft > 0 ? (
            <form action={startAttempt.bind(null, id)}>
              {a.timeLimitMin > 0 && <p className="mb-2 text-xs text-ink-2">O cronômetro de {a.timeLimitMin} minutos começa quando você clicar.</p>}
              {row.status === "overdue" && <p className="mb-2 text-xs text-danger">O prazo já passou. Sua entrega vai aparecer como atrasada.</p>}
              <SubmitButton pendingText="Abrindo...">{finished.length ? `Fazer de novo (${row.attemptsLeft} restante${row.attemptsLeft > 1 ? "s" : ""})` : "Começar"}</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-ink-3">Você já usou todas as tentativas.</p>
          )}
        </div>
      </Card>

      {finished.length > 0 && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Suas entregas</h2>
          <div className="divide-y divide-line">
            {finished.map((s) => (
              <Link key={s.id} href={`/aluno/atividades/${id}/resultado?e=${s.id}`} className="flex items-center gap-2 py-2 text-sm hover:underline">
                <span className="flex-1">Tentativa {s.attempt} · {formatDateTime(s.submittedAt)}</span>
                {s.late && <Badge variant="warning">Atrasada</Badge>}
                {s.status === "graded" ? (
                  <Badge variant={scoreVariant(percent(s.score, s.maxScore))}>{s.score}/{s.maxScore}</Badge>
                ) : (
                  <Badge variant="purple">Aguardando correção</Badge>
                )}
              </Link>
            ))}
          </div>
        </Card>
      )}
      {row.status === "overdue" && row.attemptsLeft === 0 && <Notice variant="warning">Prazo encerrado.</Notice>}
    </>
  );
}
