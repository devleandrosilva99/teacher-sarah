import { notFound } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { classes, lessons, students } from "@/server/db/repo";
import { deleteLesson, updateLesson } from "@/server/actions/lessons";
import ConfirmButton from "@/components/ConfirmButton";
import SubmitButton from "@/components/SubmitButton";
import { ButtonLink, Card, Field, Input, Notice, PageHeader, Select, Textarea } from "@/components/ui";
import { formatWeekdayTime, toInputDateTime } from "@/lib/format";

export const metadata = { title: "Aula" };

export default async function AulaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  const { salvo } = await searchParams;
  const lesson = await lessons.get(teacher.id, id);
  if (!lesson) notFound();
  const [studs, group] = await Promise.all([students.all(teacher.id), lesson.classId ? classes.get(teacher.id, lesson.classId) : null]);
  const people = lesson.studentId ? studs.filter((s) => s.id === lesson.studentId) : studs.filter((s) => group?.studentIds.includes(s.id));
  const who = lesson.studentId ? people[0]?.name ?? "Aluno removido" : group?.name ?? "Turma removida";

  return (
    <>
      <PageHeader
        title={lesson.topic || "Aula"}
        subtitle={`${who} · ${formatWeekdayTime(lesson.startsAt)}`}
        back={{ href: "/professor/agenda", label: "Agenda" }}
        actions={lesson.meetingUrl ? <ButtonLink href={lesson.meetingUrl} target="_blank" variant="secondary">Abrir videochamada</ButtonLink> : undefined}
      />
      {salvo && <div className="mb-4"><Notice variant="success">Aula atualizada.</Notice></div>}
      <form action={updateLesson.bind(null, id)} className="flex flex-col gap-4">
        <Card>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Data e hora" className="sm:col-span-2">
              <Input type="datetime-local" name="startsAt" defaultValue={toInputDateTime(lesson.startsAt)} />
            </Field>
            <Field label="Duração (min)">
              <Input type="number" name="durationMin" defaultValue={lesson.durationMin} min={15} max={480} />
            </Field>
            <Field label="Situação">
              <Select name="status" defaultValue={lesson.status}>
                <option value="scheduled">Agendada</option>
                <option value="done">Realizada</option>
                <option value="canceled">Cancelada</option>
              </Select>
            </Field>
            <Field label="Tema" className="sm:col-span-2">
              <Input name="topic" defaultValue={lesson.topic} maxLength={200} />
            </Field>
            <Field label="Link da videochamada" className="sm:col-span-2">
              <Input name="meetingUrl" defaultValue={lesson.meetingUrl} maxLength={500} />
            </Field>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Registro da aula (o aluno vê)</h2>
          <div className="flex flex-col gap-3">
            <Field label="O que foi visto">
              <Textarea name="notes" defaultValue={lesson.notes} maxLength={5000} className="min-h-28" />
            </Field>
            <Field label="Vocabulário da aula" hint="Uma palavra ou expressão por linha (ou separadas por vírgula)">
              <Textarea name="vocabulary" defaultValue={lesson.vocabulary.join("\n")} className="min-h-20" />
            </Field>
          </div>
        </Card>
        {people.length > 0 && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Presença</h2>
            <div className="divide-y divide-line">
              {people.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="flex-1">{s.name}</span>
                  {(["present", "absent"] as const).map((v) => (
                    <label key={v} className="flex items-center gap-1 text-xs">
                      <input type="radio" name={`att:${s.id}`} value={v} defaultChecked={lesson.attendance[s.id] === v} />
                      {v === "present" ? "Presente" : "Faltou"}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        )}
        <div>
          <SubmitButton>Salvar</SubmitButton>
        </div>
      </form>
      <div className="mt-6 flex flex-wrap gap-2">
        <form action={deleteLesson.bind(null, id, false)}>
          <ConfirmButton variant="danger" message="Excluir esta aula?">Excluir aula</ConfirmButton>
        </form>
        {lesson.seriesId && (
          <form action={deleteLesson.bind(null, id, true)}>
            <ConfirmButton variant="danger" message="Excluir esta e as próximas aulas da série?">Excluir esta e as próximas</ConfirmButton>
          </form>
        )}
      </div>
    </>
  );
}
