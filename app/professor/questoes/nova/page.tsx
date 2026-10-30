import { requireTeacher } from "@/server/auth/session";
import { uploadsAvailable } from "@/server/storage";
import { passages, subjects } from "@/server/db/repo";
import QuestionEditor from "@/components/questions/QuestionEditor";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Nova questão" };

export default async function NovaQuestaoPage({ searchParams }: { searchParams: Promise<{ leitura?: string }> }) {
  const { teacher } = await requireTeacher();
  const { leitura } = await searchParams;
  const [ps, subjectList] = await Promise.all([passages.all(teacher.id), subjects.all(teacher.id)]);
  const fromPassage = leitura ? ps.find((p) => p.id === leitura) : undefined;
  return (
    <>
      <PageHeader
        title="Nova questão"
        subtitle={fromPassage ? `Sobre o texto "${fromPassage.title}"` : undefined}
        back={fromPassage ? { href: `/professor/leituras/${fromPassage.id}`, label: fromPassage.title } : { href: "/professor/questoes", label: "Banco de questões" }}
      />
      <QuestionEditor canUpload={uploadsAvailable()}
        subjects={subjectList}
        passages={ps.map((p) => ({ id: p.id, title: p.title, subjectId: p.subjectId }))}
        defaultSubjectId={fromPassage?.subjectId}
        defaultPassageId={fromPassage?.id}
        next={fromPassage ? `/professor/leituras/${fromPassage.id}` : ""}
      />
    </>
  );
}
