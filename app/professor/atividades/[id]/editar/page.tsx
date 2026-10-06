import { notFound } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { activities } from "@/server/db/repo";
import { pickerData } from "@/server/services/bank";
import ActivityBuilder from "@/components/teacher/ActivityBuilder";
import { Notice, PageHeader } from "@/components/ui";

export const metadata = { title: "Editar atividade" };

export default async function EditarAtividadePage({ params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  const activity = await activities.get(teacher.id, id);
  if (!activity) notFound();
  const { bank, passages } = await pickerData(teacher.id, activity.items.map((i) => i.questionId));
  return (
    <>
      <PageHeader title="Editar atividade" back={{ href: `/professor/atividades/${id}`, label: activity.title }} />
      <div className="mb-4">
        <Notice>As mudanças valem para os próximos envios. Quem já recebeu continua com a versão enviada.</Notice>
      </div>
      <ActivityBuilder activity={activity} bank={bank} passages={passages} />
    </>
  );
}
