import Link from "next/link";
import { requireTeacher } from "@/server/auth/session";
import { assignments, classes, students, subjects, submissions } from "@/server/db/repo";
import SubjectFilter from "@/components/teacher/SubjectFilter";
import { mainLevel } from "@/lib/subjects";
import { rowFor, summarize } from "@/server/services/assignments";
import { SkillBars } from "@/components/charts";
import { Badge, Card, EmptyState, PageHeader, ProgressBar, Select, scoreVariant } from "@/components/ui";
import { TYPE_SHORT } from "@/lib/question-types";
import { percent } from "@/lib/format";
import type { Skill } from "@/lib/types";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ turma?: string; disciplina?: string }> }) {
  const { teacher } = await requireTeacher();
  const { turma, disciplina } = await searchParams;
  const [studs, allAsgs, subs, cls, subjectList] = await Promise.all([
    students.all(teacher.id),
    assignments.all(teacher.id),
    submissions.all(teacher.id),
    classes.all(teacher.id),
    subjects.all(teacher.id),
  ]);
  // Com uma disciplina escolhida, o relatório considera só os envios dela.
  const subject = subjectList.find((x) => x.id === disciplina);
  const asgs = subject ? allAsgs.filter((a) => a.subjectId === subject.id) : allAsgs;
  const group = turma ? cls.find((c) => c.id === turma) : undefined;
  const scope = studs.filter((s) => s.status === "active" && (!group || group.studentIds.includes(s.id)));
  const scopeIds = new Set(scope.map((s) => s.id));

  const perStudent = scope
    .map((s) => ({ s, sum: summarize(asgs.filter((a) => a.studentIds.includes(s.id)).map((a) => rowFor(a, s.id, subs))) }))
    .sort((a, b) => (a.sum.average ?? 101) - (b.sum.average ?? 101));

  // Desempenho por habilidade e questões mais erradas (respostas corrigidas dos alunos no escopo).
  const skill = new Map<Skill, { label: string; s: number; m: number; n: number }>();
  const qStats = new Map<string, { prompt: string; type: string; hits: number; total: number; score: number; max: number }>();
  for (const sub of subs) {
    if (sub.status === "in_progress" || !scopeIds.has(sub.studentId)) continue;
    const a = asgs.find((x) => x.id === sub.assignmentId);
    if (!a) continue;
    for (const q of a.questions) {
      const ans = sub.answers[q.id];
      if (!ans || ans.score === null) continue;
      const k = skill.get(q.skill) ?? { label: q.skillLabel ?? q.skill, s: 0, m: 0, n: 0 };
      k.s += ans.score;
      k.m += ans.maxScore;
      k.n++;
      skill.set(q.skill, k);
      const st = qStats.get(q.id) ?? { prompt: q.prompt, type: q.type, hits: 0, total: 0, score: 0, max: 0 };
      st.total++;
      st.score += ans.score;
      st.max += ans.maxScore;
      if (ans.correct) st.hits++;
      qStats.set(q.id, st);
    }
  }
  const hardest = [...qStats.entries()]
    .map(([id, v]) => ({ id, ...v, pct: percent(v.score, v.max) }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 10);
  const graded = perStudent.filter((x) => x.sum.average !== null);
  const avg = graded.length ? Math.round(graded.reduce((a, x) => a + (x.sum.average ?? 0), 0) / graded.length) : null;

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle={[group ? `Turma: ${group.name}` : "Todos os alunos ativos", subject?.name].filter(Boolean).join(" · ")}
        actions={
          cls.length > 0 ? (
            <form className="flex gap-2">
              {subject && <input type="hidden" name="disciplina" value={subject.id} />}
              <Select name="turma" defaultValue={turma ?? ""} className="w-56">
                <option value="">Todos os alunos</option>
                {cls.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <button className="rounded-lg bg-surface-raised px-3 text-sm font-medium">Ver</button>
            </form>
          ) : undefined
        }
      />

      <SubjectFilter subjects={subjectList} current={subject?.id ?? ""} basePath="/professor/relatorios" params={{ turma }} />
      {scope.length === 0 ? (
        <EmptyState title="Sem alunos neste filtro" />
      ) : (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            <Card>
              <div className="text-xs text-ink-2">Média geral</div>
              <div className="mt-1 text-3xl font-medium">{avg !== null ? `${avg}%` : "—"}</div>
              <div className="mt-1 text-xs text-ink-3">Média das notas de {graded.length} aluno(s) com atividades corrigidas</div>
            </Card>
            <Card className="lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold">Por habilidade</h2>
              <SkillBars skills={[...skill.entries()].map(([k, v]) => ({ skill: k, label: v.label, percent: percent(v.s, v.m), answered: v.n }))} />
            </Card>
          </div>

          <Card className="mb-4">
            <h2 className="mb-3 text-sm font-semibold">Alunos (menor média primeiro)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-3">
                    <th className="py-2 font-normal">Aluno</th>
                    <th className="w-48 py-2 font-normal">Média</th>
                    <th className="py-2 text-right font-normal">Feitas</th>
                    <th className="py-2 text-right font-normal">Pendentes</th>
                    <th className="py-2 text-right font-normal">Atrasadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {perStudent.map(({ s, sum }) => (
                    <tr key={s.id}>
                      <td className="py-2"><Link href={`/professor/alunos/${s.id}`} className="hover:underline">{s.name}</Link> <span className="text-xs text-ink-3">{subject ? s.levels[subject.id] ?? "" : mainLevel(s, subjectList)?.code ?? ""}</span></td>
                      <td className="py-2">
                        {sum.average !== null ? (
                          <div className="flex items-center gap-2"><ProgressBar value={sum.average} className="w-24" /><span className="text-xs">{sum.average}%</span></div>
                        ) : <span className="text-xs text-ink-3">—</span>}
                      </td>
                      <td className="py-2 text-right">{sum.completed}/{sum.total}</td>
                      <td className="py-2 text-right">{sum.pending}</td>
                      <td className={`py-2 text-right ${sum.overdue ? "text-danger" : ""}`}>{sum.overdue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h2 className="mb-1 text-sm font-semibold">Questões com mais erros</h2>
            <p className="mb-3 text-xs text-ink-3">Bom ponto de partida para revisar em aula.</p>
            {hardest.length === 0 ? (
              <p className="text-sm text-ink-3">Sem respostas corrigidas ainda.</p>
            ) : (
              <ol className="divide-y divide-line">
                {hardest.map((q) => (
                  <li key={q.id} className="flex items-center gap-2 py-2 text-sm">
                    <Link href={`/professor/questoes/${q.id}`} className="min-w-0 flex-1 truncate hover:underline">{q.prompt}</Link>
                    <Badge variant="purple">{TYPE_SHORT[q.type as keyof typeof TYPE_SHORT]}</Badge>
                    <span className="w-24 text-right text-xs text-ink-3">{q.total} resposta(s)</span>
                    <Badge variant={scoreVariant(q.pct)}>{q.pct}% de acerto</Badge>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </>
  );
}
