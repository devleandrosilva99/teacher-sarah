import Link from "next/link";
import { uploadsAvailable } from "@/server/storage";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { passages, questions, subjects } from "@/server/db/repo";
import { deletePassage } from "@/server/actions/questions";
import PassageForm from "@/components/teacher/PassageForm";
import ConfirmButton from "@/components/ConfirmButton";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { TYPE_SHORT } from "@/lib/question-types";

export default async function LeituraPage({ params }: { params: Promise<{ id: string }> }) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  const passage = await passages.get(teacher.id, id);
  if (!passage) notFound();
  const qs = (await questions.all(teacher.id)).filter((q) => q.passageId === id && q.status !== "archived").sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <>
      <PageHeader title={passage.title} back={{ href: "/professor/leituras", label: "Leituras" }} />
      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Questões sobre este texto ({qs.length})</h2>
          <ButtonLink href={`/professor/questoes/nova?leitura=${id}`} variant="secondary" className="px-3 py-1.5 text-xs">
            <Plus size={14} /> Adicionar questão
          </ButtonLink>
        </div>
        {qs.length === 0 ? (
          <p className="text-sm text-ink-3">Nenhuma questão ainda. Adicione perguntas de qualquer tipo.</p>
        ) : (
          <ol className="divide-y divide-line">
            {qs.map((q, i) => (
              <li key={q.id}>
                <Link href={`/professor/questoes/${q.id}`} className="flex items-center gap-2 py-2 text-sm hover:underline">
                  <span className="w-5 text-ink-3">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate">{q.prompt}</span>
                  <Badge variant="purple">{TYPE_SHORT[q.type]}</Badge>
                  {q.status === "draft" && <Badge variant="warning">Rascunho</Badge>}
                </Link>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-ink-3">Ao montar uma atividade, use &quot;Adicionar leitura&quot; para incluir o texto e todas estas questões de uma vez.</p>
      </Card>
      <PassageForm canUpload={uploadsAvailable()} passage={passage} subjects={await subjects.all(teacher.id)} />
      <form action={deletePassage.bind(null, id)} className="mt-6">
        <ConfirmButton variant="danger" message="Excluir este texto? As questões continuam no banco, sem o texto.">Excluir texto</ConfirmButton>
      </form>
    </>
  );
}
