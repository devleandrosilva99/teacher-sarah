import { requireTeacher } from "@/server/auth/session";
import { uploadsAvailable } from "@/server/storage";
import { subjects } from "@/server/db/repo";
import PassageForm from "@/components/teacher/PassageForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Novo texto" };

export default async function NovaLeituraPage() {
  const { teacher } = await requireTeacher();
  const subjectList = await subjects.all(teacher.id);
  return (
    <>
      <PageHeader title="Novo texto de leitura ou áudio" back={{ href: "/professor/leituras", label: "Leituras" }} />
      <PassageForm canUpload={uploadsAvailable()} subjects={subjectList} />
    </>
  );
}
