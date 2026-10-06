import { notFound } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { classes, students } from "@/server/db/repo";
import { deleteClass } from "@/server/actions/students";
import ClassForm from "@/components/teacher/ClassForm";
import ConfirmButton from "@/components/ConfirmButton";
import { ButtonLink, PageHeader } from "@/components/ui";

export default async function TurmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await requireTeacher();
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
      <ClassForm group={group} students={list.map(({ id, name, level, avatarColor }) => ({ id, name, level, avatarColor }))} />
      <form action={deleteClass.bind(null, id)} className="mt-6">
        <ConfirmButton variant="danger" message="Excluir esta turma? Os alunos e o histórico não são apagados.">Excluir turma</ConfirmButton>
      </form>
    </>
  );
}
