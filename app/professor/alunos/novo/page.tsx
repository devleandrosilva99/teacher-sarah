import { requireTeacher } from "@/server/auth/session";
import StudentForm from "@/components/teacher/StudentForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Novo aluno" };

export default async function NovoAlunoPage() {
  await requireTeacher();
  return (
    <>
      <PageHeader title="Novo aluno" back={{ href: "/professor/alunos", label: "Alunos" }} subtitle="Depois de salvar, você gera o link de acesso para o aluno." />
      <StudentForm />
    </>
  );
}
