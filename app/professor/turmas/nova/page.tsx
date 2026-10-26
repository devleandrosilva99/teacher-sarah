import { requireTeacher } from "@/server/auth/session";
import { students, subjects } from "@/server/db/repo";
import { mainLevel } from "@/lib/subjects";
import ClassForm from "@/components/teacher/ClassForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Nova turma" };

export default async function NovaTurmaPage() {
  const { teacher } = await requireTeacher();
  const subjectList = await subjects.all(teacher.id);
  const list = (await students.all(teacher.id)).filter((s) => s.status === "active").sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageHeader title="Nova turma" back={{ href: "/professor/turmas", label: "Turmas" }} />
      <ClassForm subjects={subjectList} students={list.map((s) => ({ id: s.id, name: s.name, level: mainLevel(s, subjectList)?.code ?? "", avatarColor: s.avatarColor }))} />
    </>
  );
}
