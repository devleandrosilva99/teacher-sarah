import { Video } from "lucide-react";
import { requireStudent } from "@/server/auth/session";
import { lessons } from "@/server/db/repo";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatWeekdayTime } from "@/lib/format";

export const metadata = { title: "Aulas" };

export default async function AgendaAlunoPage() {
  const { student, scope } = await requireStudent();
  // A RLS já limita às aulas do aluno e das turmas dele.
  const mine = await lessons.all(scope);
  const now = Date.now();
  const upcoming = mine
    .filter((l) => l.status !== "done" && new Date(l.startsAt).getTime() + l.durationMin * 60_000 > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = mine
    .filter((l) => l.status === "done" || new Date(l.startsAt).getTime() + l.durationMin * 60_000 <= now)
    .filter((l) => l.status !== "canceled")
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <>
      <PageHeader title="Aulas" />
      <h2 className="mb-2 text-sm font-semibold">Próximas</h2>
      {upcoming.length === 0 ? (
        <EmptyState title="Nenhuma aula agendada" />
      ) : (
        <div className="flex flex-col gap-2">
          {upcoming.map((l) => (
            <Card key={l.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{l.topic || "Aula"}</div>
                <div className="text-xs text-ink-2">{formatWeekdayTime(l.startsAt)} · {l.durationMin} min{l.classId ? " · em turma" : ""}</div>
              </div>
              {l.status === "canceled" ? (
                <Badge variant="danger">Cancelada</Badge>
              ) : (
                l.meetingUrl && <ButtonLink href={l.meetingUrl} target="_blank" variant="secondary" className="px-3 py-1.5 text-xs"><Video size={14} /> Entrar</ButtonLink>
              )}
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-2 mt-6 text-sm font-semibold">Anteriores</h2>
      {past.length === 0 ? (
        <p className="text-sm text-ink-3">Nenhuma aula anterior.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {past.map((l) => (
            <Card key={l.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{l.topic || "Aula"}</div>
                <div className="flex items-center gap-2">
                  {l.attendance[student.id] === "absent" && <Badge variant="warning">Falta</Badge>}
                  <span className="text-xs text-ink-3">{formatWeekdayTime(l.startsAt)}</span>
                </div>
              </div>
              {l.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{l.notes}</p>}
              {l.vocabulary.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {l.vocabulary.map((w) => <span key={w} className="rounded-md bg-sky-bg px-2 py-0.5 text-xs text-sky-fg">{w}</span>)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
