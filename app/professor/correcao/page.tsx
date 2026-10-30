import Link from "next/link";
import { requireTeacher } from "@/server/auth/session";
import { withScope } from "@/server/db/repo";
import { Avatar, Badge, ButtonLink, EmptyState, Notice, PageHeader, scoreVariant } from "@/components/ui";
import { formatDateTime, percent } from "@/lib/format";

export const metadata = { title: "Correção" };

export default async function CorrecaoPage({ searchParams }: { searchParams: Promise<{ fim?: string }> }) {
  const { teacher } = await requireTeacher();
  const { fim } = await searchParams;
  const { queue, asgs, studs } = await withScope(teacher.id, async (r) => ({
    queue: await r.submissions.gradingQueue(20),
    asgs: await r.assignments.titles(),
    studs: await r.students.all(),
  }));
  const aById = new Map(asgs.map((a) => [a.id, a]));
  const sById = new Map(studs.map((s) => [s.id, s]));
  const { pending, recent } = queue;

  const row = (s: (typeof pending)[number]) => {
    const st = sById.get(s.studentId);
    const a = aById.get(s.assignmentId);
    const open = s.openCount;
    return (
      <Link key={s.id} href={`/professor/correcao/${s.id}`} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-page">
        <Avatar name={st?.name ?? "?"} color={st?.avatarColor} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{st?.name ?? "Aluno removido"}</div>
          <div className="truncate text-xs text-ink-3">{a?.title} · entregue {formatDateTime(s.submittedAt)}</div>
        </div>
        {s.late && <Badge variant="warning">Atrasada</Badge>}
        {s.status === "submitted" ? (
          <Badge variant="purple">{open} para corrigir</Badge>
        ) : (
          <Badge variant={scoreVariant(percent(s.score, s.maxScore))}>{percent(s.score, s.maxScore)}%</Badge>
        )}
      </Link>
    );
  };

  return (
    <>
      <PageHeader
        title="Correção"
        subtitle="Respostas abertas esperando sua nota. As demais questões são corrigidas automaticamente."
        actions={pending.length > 0 ? <ButtonLink href={`/professor/correcao/${pending[0].id}`}>Começar a corrigir</ButtonLink> : undefined}
      />
      {fim && <div className="mb-4"><Notice variant="success">Tudo corrigido!</Notice></div>}
      <h2 className="mb-2 text-sm font-semibold">Para corrigir ({pending.length})</h2>
      {pending.length === 0 ? (
        <EmptyState title="Nada para corrigir agora" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">{pending.map(row)}</div>
      )}
      <h2 className="mb-2 mt-8 text-sm font-semibold">Corrigidas recentemente</h2>
      {recent.length === 0 ? (
        <p className="text-sm text-ink-3">Nenhuma ainda.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">{recent.map(row)}</div>
      )}
    </>
  );
}
