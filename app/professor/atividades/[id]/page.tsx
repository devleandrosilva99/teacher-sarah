import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Pencil, RotateCcw } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { activities, assignments, classes, questions, students, submissions } from "@/server/db/repo";
import { deleteAssignment, setActivityArchived, updateAssignmentDue } from "@/server/actions/activities";
import { rowFor } from "@/server/services/assignments";
import AssignForm from "@/components/teacher/AssignForm";
import ConfirmButton from "@/components/ConfirmButton";
import SubmitButton from "@/components/SubmitButton";
import { Badge, Button, ButtonLink, Card, Notice, PageHeader, scoreVariant } from "@/components/ui";
import { ASSIGNMENT_STATUS, SHOW_ANSWERS_LABELS } from "@/lib/labels";
import { TYPE_SHORT } from "@/lib/question-types";
import { formatDateTime, toInputDateTime } from "@/lib/format";

export default async function AtividadePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nova?: string; atribuir?: string }>;
}) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  const sp = await searchParams;
  const activity = await activities.get(teacher.id, id);
  if (!activity) notFound();
  const [qs, asgs, subs, studs, cls] = await Promise.all([
    questions.all(teacher.id),
    assignments.all(teacher.id),
    submissions.all(teacher.id),
    students.all(teacher.id),
    classes.all(teacher.id),
  ]);
  const qById = new Map(qs.map((q) => [q.id, q]));
  const sById = new Map(studs.map((s) => [s.id, s]));
  const sent = asgs.filter((a) => a.activityId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const active = studs.filter((s) => s.status === "active").sort((a, b) => a.name.localeCompare(b.name));
  const total = activity.items.reduce((a, i) => a + i.points, 0);

  return (
    <>
      <PageHeader
        title={activity.title}
        back={{ href: "/professor/atividades", label: "Atividades" }}
        subtitle={`${activity.items.length} questões · ${total} pontos${activity.timeLimitMin ? ` · ${activity.timeLimitMin} min` : ""} · ${activity.maxAttempts} tentativa(s) · gabarito: ${SHOW_ANSWERS_LABELS[activity.showAnswers].toLowerCase()}`}
        actions={
          <>
            <ButtonLink href={`/professor/atividades/${id}/editar`} variant="secondary"><Pencil size={15} /> Editar</ButtonLink>
            <form action={setActivityArchived.bind(null, id, !activity.archived)}>
              <Button type="submit" variant="secondary">
                {activity.archived ? <><RotateCcw size={15} /> Restaurar</> : <><Archive size={15} /> Arquivar</>}
              </Button>
            </form>
          </>
        }
      />
      {sp.nova && <div className="mb-4"><Notice variant="success">Atividade criada. Agora envie para alunos ou turmas.</Notice></div>}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Questões</h2>
          {activity.instructions && <p className="mb-3 text-sm text-ink-2">{activity.instructions}</p>}
          <ol className="divide-y divide-line">
            {activity.items.map((it, i) => {
              const q = qById.get(it.questionId);
              return (
                <li key={it.questionId} className="flex items-center gap-2 py-2 text-sm">
                  <span className="w-5 text-ink-3">{i + 1}.</span>
                  {q ? (
                    <Link href={`/professor/questoes/${q.id}`} className="min-w-0 flex-1 truncate hover:underline">{q.prompt}</Link>
                  ) : (
                    <span className="flex-1 text-ink-3">Questão removida</span>
                  )}
                  {q && <Badge variant="purple">{TYPE_SHORT[q.type]}</Badge>}
                  <span className="text-xs text-ink-3">{it.points} pt</span>
                </li>
              );
            })}
          </ol>
        </Card>
        <Card>
          <h2 id="atribuir" className="mb-3 text-sm font-semibold">Enviar para</h2>
          {activity.archived ? (
            <p className="text-sm text-ink-3">Restaure a atividade para enviá-la.</p>
          ) : (
            <AssignForm
              activityId={id}
              preselected={sp.atribuir}
              classes={cls.map((c) => ({ id: c.id, name: c.name, count: c.studentIds.length }))}
              students={active.map((s) => ({ id: s.id, name: s.name, level: s.level }))}
            />
          )}
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold">Envios ({sent.length})</h2>
      {sent.length === 0 && <p className="text-sm text-ink-3">Esta atividade ainda não foi enviada.</p>}
      <div className="flex flex-col gap-4">
        {sent.map((a) => {
          const rows = a.studentIds.map((sid) => ({ student: sById.get(sid), row: rowFor(a, sid, subs) }));
          const done = rows.filter((r) => r.row.status === "graded" || r.row.status === "submitted").length;
          return (
            <Card key={a.id}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">
                    {a.classId ? cls.find((c) => c.id === a.classId)?.name ?? "Turma" : `${a.studentIds.length} aluno(s)`}
                  </div>
                  <div className="text-xs text-ink-3">
                    Enviada em {formatDateTime(a.releaseAt)} · {done}/{rows.length} entregaram
                  </div>
                </div>
                <form action={updateAssignmentDue.bind(null, a.id)} className="flex items-end gap-2">
                  <label className="flex flex-col gap-0.5 text-xs text-ink-2">
                    Prazo
                    <input type="datetime-local" name="dueAt" defaultValue={toInputDateTime(a.dueAt)} className="rounded-md border border-line px-2 py-1 text-xs" />
                  </label>
                  <SubmitButton variant="secondary" className="px-2.5 py-1 text-xs" pendingText="...">Salvar</SubmitButton>
                </form>
              </div>
              <div className="divide-y divide-line">
                {rows.map(({ student, row }) => (
                  <div key={row.assignment.id + (student?.id ?? "")} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    <span className="flex-1">{student?.name ?? "Aluno removido"}</span>
                    <Badge variant={ASSIGNMENT_STATUS[row.status].variant}>{ASSIGNMENT_STATUS[row.status].label}</Badge>
                    {row.best?.late && <Badge variant="warning">Entregue com atraso</Badge>}
                    {row.percent !== null && <Badge variant={scoreVariant(row.percent)}>{row.percent}%</Badge>}
                    {row.best && (
                      <Link href={`/professor/correcao/${row.best.id}`} className="text-xs text-brand hover:underline">
                        {row.best.status === "submitted" ? "Corrigir" : "Ver"}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
              <form action={deleteAssignment.bind(null, a.id)} className="mt-3">
                <ConfirmButton variant="ghost" className="px-2 py-1 text-xs text-danger" message="Cancelar este envio? As respostas dos alunos para ele serão apagadas.">
                  Cancelar envio
                </ConfirmButton>
              </form>
            </Card>
          );
        })}
      </div>
    </>
  );
}
