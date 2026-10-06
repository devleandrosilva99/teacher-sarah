import { notFound } from "next/navigation";
import { Archive, Copy, RotateCcw } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { activities, passages, questions } from "@/server/db/repo";
import { duplicateQuestion, setQuestionStatus } from "@/server/actions/questions";
import QuestionEditor from "@/components/questions/QuestionEditor";
import { Button, Notice, PageHeader } from "@/components/ui";

export const metadata = { title: "Editar questão" };

export default async function EditarQuestaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  const [question, ps, acts] = await Promise.all([questions.get(teacher.id, id), passages.all(teacher.id), activities.all(teacher.id)]);
  if (!question) notFound();
  const usedIn = acts.filter((a) => a.items.some((i) => i.questionId === id));
  const archived = question.status === "archived";

  return (
    <>
      <PageHeader
        title="Editar questão"
        back={{ href: "/professor/questoes", label: "Banco de questões" }}
        actions={
          <>
            <form action={duplicateQuestion.bind(null, id)}>
              <Button variant="secondary" type="submit"><Copy size={15} /> Duplicar</Button>
            </form>
            <form action={setQuestionStatus.bind(null, id, archived ? "draft" : "archived")}>
              <Button variant="secondary" type="submit">
                {archived ? <><RotateCcw size={15} /> Restaurar</> : <><Archive size={15} /> Arquivar</>}
              </Button>
            </form>
          </>
        }
      />
      {usedIn.length > 0 && (
        <div className="mb-4">
          <Notice>
            Usada em {usedIn.map((a) => a.title).join(", ")}. Mudanças valem para as próximas atribuições; alunos que já receberam a atividade continuam vendo a versão anterior.
          </Notice>
        </div>
      )}
      {archived && <div className="mb-4"><Notice variant="warning">Questão arquivada: não aparece ao montar atividades.</Notice></div>}
      <QuestionEditor question={question} passages={ps.map((p) => ({ id: p.id, title: p.title }))} />
    </>
  );
}
