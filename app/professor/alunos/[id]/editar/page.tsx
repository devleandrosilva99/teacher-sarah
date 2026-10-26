import { notFound } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { students, subjects } from "@/server/db/repo";
import StudentForm from "@/components/teacher/StudentForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Editar aluno" };

export default async function EditarAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  const student = await students.get(teacher.id, id);
  if (!student) notFound();
  return (
    <>
      <PageHeader title={`Editar ${student.name}`} back={{ href: `/professor/alunos/${id}`, label: student.name }} />
      <StudentForm student={student} subjects={await subjects.all(teacher.id)} />
    </>
  );
}
