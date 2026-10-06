import { requireTeacher } from "@/server/auth/session";
import PassageForm from "@/components/teacher/PassageForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Novo texto" };

export default async function NovaLeituraPage() {
  await requireTeacher();
  return (
    <>
      <PageHeader title="Novo texto de leitura ou áudio" back={{ href: "/professor/leituras", label: "Leituras" }} />
      <PassageForm />
    </>
  );
}
