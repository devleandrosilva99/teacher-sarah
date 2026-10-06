import Link from "next/link";
import { Plus } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { activities, assignments, classes, students } from "@/server/db/repo";
import { Badge, ButtonLink, EmptyState, Notice, PageHeader } from "@/components/ui";
import { formatDate, plural } from "@/lib/format";

export const metadata = { title: "Atividades" };

export default async function AtividadesPage({ searchParams }: { searchParams: Promise<{ atribuir?: string; arquivadas?: string }> }) {
  const { teacher } = await requireTeacher();
  const sp = await searchParams;
  const [acts, asgs, studs, cls] = await Promise.all([
    activities.all(teacher.id),
    assignments.all(teacher.id),
    students.all(teacher.id),
    classes.all(teacher.id),
  ]);
  const showArchived = sp.arquivadas === "1";
  const list = acts.filter((a) => a.archived === showArchived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  let targetName = "";
  if (sp.atribuir) {
    const [kind, id] = sp.atribuir.split(":");
    targetName = kind === "aluno" ? studs.find((s) => s.id === id)?.name ?? "" : cls.find((c) => c.id === id)?.name ?? "";
  }

  return (
    <>
      <PageHeader
        title="Atividades"
        subtitle="Listas de exercícios montadas com questões do banco."
        actions={<ButtonLink href="/professor/atividades/nova"><Plus size={16} /> Nova atividade</ButtonLink>}
      />
      {targetName && (
        <div className="mb-4">
          <Notice>Escolha a atividade que vai para <b>{targetName}</b>.</Notice>
        </div>
      )}
      {list.length === 0 ? (
        <EmptyState title={showArchived ? "Nenhuma atividade arquivada" : "Nenhuma atividade ainda"}>
          {!showArchived && "Crie questões no banco e depois monte sua primeira atividade."}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {list.map((a) => {
            const sent = asgs.filter((x) => x.activityId === a.id);
            const reach = new Set(sent.flatMap((x) => x.studentIds)).size;
            const href = `/professor/atividades/${a.id}${sp.atribuir ? `?atribuir=${encodeURIComponent(sp.atribuir)}#atribuir` : ""}`;
            return (
              <Link key={a.id} href={href} className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 last:border-b-0 hover:bg-page">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-xs text-ink-3">
                    {plural(a.items.length, "questão", "questões")} · atualizada em {formatDate(a.updatedAt)}
                  </div>
                </div>
                {a.timeLimitMin > 0 && <Badge>{a.timeLimitMin} min</Badge>}
                {reach > 0 ? <Badge variant="info">Enviada a {reach} aluno(s)</Badge> : <Badge>Não enviada</Badge>}
              </Link>
            );
          })}
        </div>
      )}
      <div className="mt-4 text-sm">
        <Link href={showArchived ? "/professor/atividades" : "/professor/atividades?arquivadas=1"} className="text-ink-2 hover:text-ink">
          {showArchived ? "← Voltar às atividades" : "Ver arquivadas"}
        </Link>
      </div>
    </>
  );
}
