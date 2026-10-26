import { requireStudent } from "@/server/auth/session";
import { studentRows } from "@/server/services/assignments";
import AssignmentCard from "@/components/student/AssignmentCard";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Atividades" };

export default async function AtividadesAlunoPage() {
  const { student, scope } = await requireStudent();
  const rows = await studentRows(scope, student.id);
  const open = rows.filter((r) => r.status === "not_started" || r.status === "in_progress" || r.status === "overdue");
  const done = rows.filter((r) => r.status === "submitted" || r.status === "graded");
  return (
    <>
      <PageHeader title="Atividades" />
      <h2 className="mb-2 text-sm font-semibold">Em aberto ({open.length})</h2>
      {open.length === 0 ? <EmptyState title="Nada pendente" /> : <div className="flex flex-col gap-2">{open.map((r) => <AssignmentCard key={r.assignment.id} row={r} />)}</div>}
      <h2 className="mb-2 mt-6 text-sm font-semibold">Entregues ({done.length})</h2>
      {done.length === 0 ? <p className="text-sm text-ink-3">Nenhuma ainda.</p> : <div className="flex flex-col gap-2">{done.map((r) => <AssignmentCard key={r.assignment.id} row={r} />)}</div>}
    </>
  );
}
