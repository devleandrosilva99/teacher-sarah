import Link from "next/link";
import { Plus } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { classes, students, subjects } from "@/server/db/repo";
import SubjectFilter from "@/components/teacher/SubjectFilter";
import { Avatar, Badge, ButtonLink, EmptyState, Notice, PageHeader, cx } from "@/components/ui";
import { plural } from "@/lib/format";

export const metadata = { title: "Turmas" };

export default async function TurmasPage({
  searchParams,
}: {
  searchParams: Promise<{ disciplina?: string; arquivadas?: string; arquivada?: string; excluida?: string }>;
}) {
  const { teacher } = await requireTeacher();
  const sp = await searchParams;
  const [allClasses, studs, subjectList] = await Promise.all([classes.all(teacher.id), students.all(teacher.id), subjects.all(teacher.id)]);
  const subject = subjectList.find((x) => x.id === sp.disciplina);
  const showArchived = sp.arquivadas === "1";
  const list = allClasses
    .filter((c) => !subject || c.subjectId === subject.id)
    .filter((c) => (showArchived ? !!c.archivedAt : !c.archivedAt));
  const archivedCount = allClasses.filter((c) => c.archivedAt).length;
  const byId = new Map(studs.map((s) => [s.id, s]));
  const tab = (archived: boolean) => {
    const q = new URLSearchParams();
    if (subject) q.set("disciplina", subject.id);
    if (archived) q.set("arquivadas", "1");
    const s = q.toString();
    return s ? `/professor/turmas?${s}` : "/professor/turmas";
  };
  return (
    <>
      <PageHeader
        title="Turmas"
        subtitle="Agrupe alunos para passar atividades e agendar aulas de uma vez."
        actions={<ButtonLink href="/professor/turmas/nova"><Plus size={16} /> Nova turma</ButtonLink>}
      />
      {sp.arquivada && <div className="mb-4"><Notice variant="success">Turma arquivada. As aulas e os relatórios dela continuam guardados.</Notice></div>}
      {sp.excluida && <div className="mb-4"><Notice variant="success">Turma excluída.</Notice></div>}
      <SubjectFilter subjects={subjectList} current={subject?.id ?? ""} basePath="/professor/turmas" params={{ arquivadas: sp.arquivadas }} />
      <div className="mb-4 flex w-fit rounded-lg border border-line bg-surface p-0.5 text-sm">
        <Link href={tab(false)} className={cx("rounded-md px-3 py-1", !showArchived && "bg-surface-raised font-medium")}>Ativas</Link>
        <Link href={tab(true)} className={cx("rounded-md px-3 py-1", showArchived && "bg-surface-raised font-medium")}>
          Arquivadas{archivedCount ? ` (${archivedCount})` : ""}
        </Link>
      </div>
      {list.length === 0 ? (
        <EmptyState title={showArchived ? "Nenhuma turma arquivada" : "Nenhuma turma ainda"} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
            <Link key={c.id} href={`/professor/turmas/${c.id}`} className="rounded-xl border border-line bg-surface p-4 hover:border-brand">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{c.name}</span>
                <span className="flex gap-1">
                  {c.archivedAt && <Badge>Arquivada</Badge>}
                  {c.level && <Badge variant="info">{c.level}</Badge>}
                </span>
              </div>
              {c.description && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{c.description}</p>}
              <div className="mt-3 flex items-center gap-1">
                {c.studentIds.slice(0, 6).map((id) => {
                  const s = byId.get(id);
                  return s ? <Avatar key={id} name={s.name} color={s.avatarColor} size={26} /> : null;
                })}
                <span className="ml-2 text-xs text-ink-3">{plural(c.studentIds.length, "aluno", "alunos")}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
