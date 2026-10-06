import Link from "next/link";
import { Plus } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { classes, students } from "@/server/db/repo";
import { Avatar, Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { plural } from "@/lib/format";

export const metadata = { title: "Turmas" };

export default async function TurmasPage() {
  const { teacher } = await requireTeacher();
  const [list, studs] = await Promise.all([classes.all(teacher.id), students.all(teacher.id)]);
  const byId = new Map(studs.map((s) => [s.id, s]));
  return (
    <>
      <PageHeader
        title="Turmas"
        subtitle="Agrupe alunos para passar atividades e agendar aulas de uma vez."
        actions={<ButtonLink href="/professor/turmas/nova"><Plus size={16} /> Nova turma</ButtonLink>}
      />
      {list.length === 0 ? (
        <EmptyState title="Nenhuma turma ainda" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
            <Link key={c.id} href={`/professor/turmas/${c.id}`} className="rounded-xl border border-line bg-surface p-4 hover:border-brand">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{c.name}</span>
                {c.level && <Badge variant="info">{c.level}</Badge>}
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
