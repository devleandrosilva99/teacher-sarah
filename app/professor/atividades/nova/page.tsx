import { requireTeacher } from "@/server/auth/session";
import { pickerData } from "@/server/services/bank";
import { subjects } from "@/server/db/repo";
import ActivityBuilder from "@/components/teacher/ActivityBuilder";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Nova atividade" };

export default async function NovaAtividadePage() {
  const { teacher } = await requireTeacher();
  const { bank, passages } = await pickerData(teacher.id);
  return (
    <>
      <PageHeader title="Nova atividade" back={{ href: "/professor/atividades", label: "Atividades" }} />
      <ActivityBuilder bank={bank} passages={passages} subjects={await subjects.all(teacher.id)} />
    </>
  );
}
