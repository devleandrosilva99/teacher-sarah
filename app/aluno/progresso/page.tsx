import { requireStudent } from "@/server/auth/session";
import { withScope } from "@/server/db/repo";
import { studentRows, summarize } from "@/server/services/assignments";
import { ScoreHistory, SkillBars } from "@/components/charts";
import { Card, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Progresso" };

export default async function ProgressoPage() {
  const { student, scope } = await requireStudent();
  const sum = summarize(await withScope(scope, (r) => studentRows(r, student.id)));
  return (
    <>
      <PageHeader title="Seu progresso" />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Média geral" value={sum.average !== null ? `${sum.average}%` : "—"} />
        <Stat label="Atividades feitas" value={`${sum.completed}/${sum.total}`} />
        <Stat label="Pendentes" value={sum.pending} />
        <Stat label="Atrasadas" value={sum.overdue} />
      </div>
      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-semibold">Evolução das notas (%)</h2>
        <ScoreHistory points={sum.history} />
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Por habilidade</h2>
        <SkillBars skills={sum.bySkill} />
      </Card>
    </>
  );
}
