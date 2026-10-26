import { notFound } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { classes, students, subjects } from "@/server/db/repo";
import { mainLevel } from "@/lib/subjects";
import { deleteClass } from "@/server/actions/students";
import ClassForm from "@/components/teacher/ClassForm";
import ConfirmButton from "@/components/ConfirmButton";
import { ButtonLink, PageHeader } from "@/components/ui";

export default async function TurmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await requireTeacher();
  const subjectList = await subjects.all(teacher.id);
  const { id } = await params;
  const group = await classes.get(teacher.id, id);
  if (!group) notFound();
  const list = (await students.all(teacher.id))
    .filter((s) => s.status === "active" || group.studentIds.includes(s.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageHeader
        title={group.name}
        back={{ href: "/professor/turmas", label: "Turmas" }}
        actions={
          <>
            <ButtonLink href={`/professor/atividades?atribuir=turma:${id}`} variant="secondary">Passar atividade</ButtonLink>
            <ButtonLink href={`/professor/agenda?nova=1&turma=${id}`} variant="secondary">Agendar aula</ButtonLink>
          </>
        }
      />
      <ClassForm group={group} subjects={subjectList} students={list.map((s) => ({ id: s.id, name: s.name, level: mainLevel(s, subjectList)?.code ?? "", avatarColor: s.avatarColor }))} />
      <form action={deleteClass.bind(null, id)} className="mt-6">
        <ConfirmButton variant="danger" message="Excluir esta turma? Os alunos e o histórico não são apagados.">Excluir turma</ConfirmButton>
      </form>
    </>
  );
}
