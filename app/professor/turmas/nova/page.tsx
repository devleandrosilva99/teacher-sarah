import { requireTeacher } from "@/server/auth/session";
import { students } from "@/server/db/repo";
import ClassForm from "@/components/teacher/ClassForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Nova turma" };

export default async function NovaTurmaPage() {
  const { teacher } = await requireTeacher();
  const list = (await students.all(teacher.id)).filter((s) => s.status === "active").sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageHeader title="Nova turma" back={{ href: "/professor/turmas", label: "Turmas" }} />
      <ClassForm students={list.map(({ id, name, level, avatarColor }) => ({ id, name, level, avatarColor }))} />
    </>
  );
}
