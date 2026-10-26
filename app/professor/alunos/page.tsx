import Link from "next/link";
import { Plus } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { assignments, students, subjects, submissions } from "@/server/db/repo";
import { mainLevel } from "@/lib/subjects";
import { rowFor, summarize } from "@/server/services/assignments";
import { Avatar, Badge, ButtonLink, EmptyState, Notice, PageHeader, scoreVariant } from "@/components/ui";
import { cx } from "@/components/ui";

export const metadata = { title: "Alunos" };

export default async function AlunosPage({ searchParams }: { searchParams: Promise<{ q?: string; arquivados?: string; excluido?: string }> }) {
  const { teacher } = await requireTeacher();
  const sp = await searchParams;
  const [all, asgs, subs, subjectList] = await Promise.all([
    students.all(teacher.id),
    assignments.all(teacher.id),
    submissions.all(teacher.id),
    subjects.all(teacher.id),
  ]);
  const showArchived = sp.arquivados === "1";
  const q = (sp.q ?? "").toLowerCase();
  const list = all
    .filter((s) => (showArchived ? s.status === "archived" : s.status === "active"))
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.email.includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Alunos"
        subtitle={`${all.filter((s) => s.status === "active").length} ativos`}
        actions={
          <ButtonLink href="/professor/alunos/novo">
            <Plus size={16} /> Novo aluno
          </ButtonLink>
        }
      />
      {sp.excluido && <div className="mb-4"><Notice variant="success">Aluno excluído definitivamente.</Notice></div>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="flex-1">
          {showArchived && <input type="hidden" name="arquivados" value="1" />}
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Buscar por nome ou e-mail"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm sm:max-w-xs"
          />
        </form>
        <div className="flex rounded-lg border border-line bg-surface p-0.5 text-sm">
          <Link href="/professor/alunos" className={cx("rounded-md px-3 py-1", !showArchived && "bg-surface-raised font-medium")}>Ativos</Link>
          <Link href="/professor/alunos?arquivados=1" className={cx("rounded-md px-3 py-1", showArchived && "bg-surface-raised font-medium")}>Arquivados</Link>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState title={showArchived ? "Nenhum aluno arquivado" : "Nenhum aluno encontrado"}>
          {!showArchived && !q && "Cadastre seu primeiro aluno e envie o link de acesso."}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {list.map((s) => {
            const rows = asgs.filter((a) => a.studentIds.includes(s.id)).map((a) => rowFor(a, s.id, subs));
            const sum = summarize(rows);
            return (
              <Link
                key={s.id}
                href={`/professor/alunos/${s.id}`}
                className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-page"
              >
                <Avatar name={s.name} color={s.avatarColor} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{s.name}</div>
                  <div className="truncate text-xs text-ink-3">{s.email}</div>
                </div>
                {mainLevel(s, subjectList) && <Badge variant="info">{mainLevel(s, subjectList)!.code}</Badge>}
                <div className="hidden w-28 text-right sm:block">
                  {sum.average !== null ? <Badge variant={scoreVariant(sum.average)}>Média {sum.average}%</Badge> : <span className="text-xs text-ink-3">Sem notas</span>}
                </div>
                <div className="hidden w-24 text-right text-xs sm:block">
                  {sum.overdue > 0 ? <span className="text-danger">{sum.overdue} atrasada(s)</span> : sum.pending > 0 ? <span className="text-ink-2">{sum.pending} pendente(s)</span> : <span className="text-ink-3">Em dia</span>}
                </div>
                {!s.userId && <Badge variant="warning">Sem acesso</Badge>}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
