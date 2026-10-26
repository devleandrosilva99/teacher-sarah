import Link from "next/link";
import { Video } from "lucide-react";
import { requireStudent } from "@/server/auth/session";
import { lessons } from "@/server/db/repo";
import { studentRows, summarize } from "@/server/services/assignments";
import AssignmentCard from "@/components/student/AssignmentCard";
import { ButtonLink, Card, EmptyState, Stat } from "@/components/ui";
import { formatWeekdayTime } from "@/lib/format";

export const metadata = { title: "Início" };

export default async function AlunoHome() {
  const { student, scope } = await requireStudent();
  // No escopo do aluno, a RLS só devolve as aulas dele e das turmas dele.
  const [rows, ls] = await Promise.all([studentRows(scope, student.id), lessons.all(scope)]);
  const sum = summarize(rows);
  const todo = rows.filter((r) => r.status === "not_started" || r.status === "in_progress" || (r.status === "overdue" && r.attemptsLeft > 0));
  const next = ls
    .filter((l) => l.status === "scheduled")
    .filter((l) => new Date(l.startsAt).getTime() + l.durationMin * 60_000 > Date.now())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  return (
    <div className="flex flex-col gap-5">
      {next && (
        <Card className="border-brand/40 bg-brand-soft">
          <div className="text-xs font-medium text-brand-ink">Próxima aula</div>
          <div className="mt-1 font-medium">{next.topic || "Aula"}</div>
          <div className="text-sm text-ink-2">{formatWeekdayTime(next.startsAt)} · {next.durationMin} min</div>
          {next.meetingUrl && (
            <ButtonLink href={next.meetingUrl} target="_blank" className="mt-3"><Video size={16} /> Entrar na aula</ButtonLink>
          )}
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Média" value={sum.average !== null ? `${sum.average}%` : "—"} />
        <Stat label="Feitas" value={sum.completed} />
        <Stat label="Pendentes" value={todo.length} />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Para fazer</h2>
          <Link href="/aluno/atividades" className="text-xs text-brand">Ver todas</Link>
        </div>
        {todo.length === 0 ? (
          <EmptyState title="Nenhuma atividade pendente">Bom trabalho!</EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {todo.slice(0, 5).map((r) => <AssignmentCard key={r.assignment.id} row={r} />)}
          </div>
        )}
      </section>
    </div>
  );
}
