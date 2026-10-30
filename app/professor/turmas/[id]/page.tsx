import { notFound } from "next/navigation";
import { Archive, RotateCcw } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { withScope } from "@/server/db/repo";
import { mainLevel } from "@/lib/subjects";
import { deleteClass, setClassArchived } from "@/server/actions/students";
import ClassForm from "@/components/teacher/ClassForm";
import ConfirmButton from "@/components/ConfirmButton";
import { Button, ButtonLink, Card, Notice, PageHeader } from "@/components/ui";
import { plural } from "@/lib/format";

export default async function TurmaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  const { erro } = await searchParams;
  const data = await withScope(teacher.id, async (r) => {
    const group = await r.classes.get(id);
    if (!group) return null;
    return { group, subjectList: await r.subjects.all(), studs: await r.students.all(), done: await r.classes.doneLessonCount(id) };
  });
  if (!data) notFound();
  const { group, subjectList, studs, done } = data;
  const archived = !!group.archivedAt;
  const list = studs.filter((s) => s.status === "active" || group.studentIds.includes(s.id)).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageHeader
        title={group.name}
        back={{ href: archived ? "/professor/turmas?arquivadas=1" : "/professor/turmas", label: "Turmas" }}
        actions={
          archived ? undefined : (
            <>
              <ButtonLink href={`/professor/atividades?atribuir=turma:${id}`} variant="secondary">Passar atividade</ButtonLink>
              <ButtonLink href={`/professor/agenda?nova=1&turma=${id}`} variant="secondary">Agendar aula</ButtonLink>
            </>
          )
        }
      />
      {archived && (
        <div className="mb-4">
          <Notice variant="warning">Turma arquivada: não aparece nas listas nem nos seletores, mas as aulas, a presença e os relatórios continuam guardados.</Notice>
        </div>
      )}
      {erro === "aulas" && (
        <div className="mb-4">
          <Notice variant="danger">Esta turma tem aulas realizadas, então não pode ser excluída. Arquive-a para manter o histórico.</Notice>
        </div>
      )}
      <ClassForm group={group} subjects={subjectList} students={list.map((s) => ({ id: s.id, name: s.name, level: mainLevel(s, subjectList)?.code ?? "", avatarColor: s.avatarColor }))} />
      <Card className="mt-6">
        <h2 className="mb-1 text-sm font-semibold">Gerenciar</h2>
        <p className="mb-3 text-xs text-ink-3">
          {done > 0
            ? `${plural(done, "aula realizada", "aulas realizadas")}: a turma pode ser arquivada, mas não excluída.`
            : "Nenhuma aula realizada: a turma pode ser excluída (as aulas agendadas são canceladas e os alunos avisados)."}
        </p>
        <div className="flex flex-wrap gap-2">
          <form action={setClassArchived.bind(null, id, !archived)}>
            <Button type="submit" variant="secondary">
              {archived ? <><RotateCcw size={15} /> Restaurar turma</> : <><Archive size={15} /> Arquivar turma</>}
            </Button>
          </form>
          {done === 0 && (
            <form action={deleteClass.bind(null, id)}>
              <ConfirmButton variant="danger" message="Excluir esta turma definitivamente? As aulas agendadas serão canceladas e os alunos avisados. Os alunos e as atividades não são apagados.">
                Excluir definitivamente
              </ConfirmButton>
            </form>
          )}
        </div>
      </Card>
    </>
  );
}
