import Link from "next/link";
import { Video } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { classes, lessons, students } from "@/server/db/repo";
import LessonForm from "@/components/teacher/LessonForm";
import { Badge, Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { TIME_ZONE } from "@/lib/format";

export const metadata = { title: "Agenda" };

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: TIME_ZONE, weekday: "long", day: "2-digit", month: "long" });
}
function time(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ passadas?: string; turma?: string; aluno?: string }> }) {
  const { teacher } = await requireTeacher();
  const sp = await searchParams;
  const [ls, studs, cls] = await Promise.all([lessons.all(teacher.id), students.all(teacher.id), classes.all(teacher.id)]);
  const sName = new Map(studs.map((s) => [s.id, s.name]));
  const cName = new Map(cls.map((c) => [c.id, c.name]));
  const past = sp.passadas === "1";
  const now = Date.now() - 2 * 3600_000;
  const list = ls
    .filter((l) => (past ? new Date(l.startsAt).getTime() < now : new Date(l.startsAt).getTime() >= now))
    .sort((a, b) => (past ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt)))
    .slice(0, 80);
  const groups = new Map<string, typeof list>();
  for (const l of list) groups.set(dayKey(l.startsAt), [...(groups.get(dayKey(l.startsAt)) ?? []), l]);
  const preselected = sp.turma ? `turma:${sp.turma}` : sp.aluno ? `aluno:${sp.aluno}` : "";

  return (
    <>
      <PageHeader title="Agenda de aulas" />
      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">Agendar aula</h2>
        <LessonForm
          preselected={preselected}
          students={studs.filter((s) => s.status === "active").sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ id: s.id, name: s.name }))}
          classes={cls.filter((c) => !c.archivedAt).map((c) => ({ id: c.id, name: c.name }))}
        />
      </Card>

      <div className="mb-3 flex gap-1 text-sm">
        <Link href="/professor/agenda" className={cx("rounded-md px-3 py-1", !past && "bg-surface-raised font-medium")}>Próximas</Link>
        <Link href="/professor/agenda?passadas=1" className={cx("rounded-md px-3 py-1", past && "bg-surface-raised font-medium")}>Anteriores</Link>
      </div>
      {list.length === 0 ? (
        <EmptyState title={past ? "Nenhuma aula anterior" : "Nenhuma aula agendada"} />
      ) : (
        <div className="flex flex-col gap-4">
          {[...groups.entries()].map(([day, items]) => (
            <div key={day}>
              <h3 className="mb-1.5 text-xs font-medium capitalize text-ink-2">{day}</h3>
              <div className="overflow-hidden rounded-xl border border-line bg-surface">
                {items.map((l) => (
                  <Link key={l.id} href={`/professor/agenda/${l.id}`} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 hover:bg-page">
                    <span className="w-12 text-sm font-medium">{time(l.startsAt)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{l.studentId ? sName.get(l.studentId) ?? "Aluno removido" : cName.get(l.classId) ?? "Turma removida"}</div>
                      <div className="truncate text-xs text-ink-3">{l.topic || "Sem tema"} · {l.durationMin} min</div>
                    </div>
                    {l.classId && <Badge variant="info">Turma</Badge>}
                    {l.seriesId && <Badge>Semanal</Badge>}
                    {l.status === "done" && <Badge variant="success">Realizada</Badge>}
                    {l.status === "canceled" && <Badge variant="danger">Cancelada</Badge>}
                    {l.meetingUrl && l.status === "scheduled" && <Video size={16} className="text-ink-3" />}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
