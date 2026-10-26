import { requireTeacher } from "@/server/auth/session";
import { subjects } from "@/server/db/repo";
import StudentForm from "@/components/teacher/StudentForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Novo aluno" };

export default async function NovoAlunoPage() {
  const { teacher } = await requireTeacher();
  const subjectList = await subjects.all(teacher.id);
  return (
    <>
      <PageHeader title="Novo aluno" back={{ href: "/professor/alunos", label: "Alunos" }} subtitle="Depois de salvar, você gera o link de acesso para o aluno." />
      <StudentForm subjects={subjectList} />
    </>
  );
}
