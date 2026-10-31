import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { withScope } from "@/server/db/repo";
import { rowFor, summarize } from "@/server/services/assignments";
import { Avatar, Badge, ButtonLink, Card, Notice, PageHeader, Stat, scoreVariant } from "@/components/ui";
import { formatWeekdayTime } from "@/lib/format";

export const metadata = { title: "Início" };

export default async function ProfessorHome({ searchParams }: { searchParams: Promise<{ bemvindo?: string; senha?: string }> }) {
  const { teacher } = await requireTeacher();
  const { bemvindo, senha } = await searchParams;
  // Uma transação; envios e tentativas vêm resumidos (sem cópia congelada nem respostas).
  const { studs, asgs, subs, ls, hasQuestions, hasActivities, cls } = await withScope(teacher.id, async (r) => ({
    studs: await r.students.all(),
    asgs: await r.assignments.summaries(),
    subs: await r.submissions.summaries(),
    ls: await r.lessons.upcoming(new Date(Date.now() - 3600_000).toISOString()),
    hasQuestions: await r.questions.exists(),
    hasActivities: await r.activities.exists(),
    cls: await r.classes.all(),
  }));
  const active = studs.filter((s) => s.status === "active");
  const sName = new Map(studs.map((s) => [s.id, s]));
  const cName = new Map(cls.map((c) => [c.id, c.name]));
  const toGrade = subs.filter((s) => s.status === "submitted").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const now = Date.now();
  const upcoming = ls;
  const weekLessons = upcoming.filter((l) => new Date(l.startsAt).getTime() < now + 7 * 86_400_000).length;

  const attention = active
    .map((s) => {
      const sum = summarize(asgs.filter((a) => a.studentIds.includes(s.id)).map((a) => rowFor(a, s.id, subs)));
      return { s, sum };
    })
    .filter(({ sum }) => sum.overdue > 0 || (sum.average !== null && sum.average < 60))
    .slice(0, 6);
  const overdueTotal = attention.reduce((a, x) => a + x.sum.overdue, 0);

  const steps = [
    { done: active.length > 0, label: "Cadastre um aluno e envie o link de acesso", href: "/professor/alunos/novo" },
    { done: hasQuestions, label: "Crie questões no banco", href: "/professor/questoes/nova" },
    { done: hasActivities, label: "Monte uma atividade", href: "/professor/atividades/nova" },
    { done: asgs.length > 0, label: "Envie a atividade para um aluno ou turma", href: "/professor/atividades" },
  ];
  const showSteps = bemvindo || steps.some((s) => !s.done);

  return (
    <>
      <PageHeader title={`Olá, ${teacher.name.split(" ")[0]}!`} subtitle="Resumo do seu dia" />
      {senha === "redefinida" && <div className="mb-4"><Notice variant="success">Senha redefinida. As outras sessões abertas foram encerradas.</Notice></div>}

      {showSteps && (
        <Card className="mb-4">
          <h2 className="mb-2 text-sm font-semibold">Primeiros passos</h2>
          <ul className="flex flex-col gap-1.5">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-2 text-sm hover:underline">
                  {s.done ? <CheckCircle2 size={16} className="text-success" /> : <Circle size={16} className="text-ink-3" />}
                  <span className={s.done ? "text-ink-3 line-through" : ""}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Alunos ativos" value={active.length} />
        <Stat label="Para corrigir" value={toGrade.length} />
        <Stat label="Aulas em 7 dias" value={weekLessons} />
        <Stat label="Atividades atrasadas" value={overdueTotal} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Próximas aulas</h2>
            <Link href="/professor/agenda" className="text-xs text-brand">Agenda</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-3">Nenhuma aula agendada.</p>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <Link href={`/professor/agenda/${l.id}`} className="flex items-center gap-2 py-2 text-sm hover:underline">
                    <span className="w-32 shrink-0 text-xs text-ink-2">{formatWeekdayTime(l.startsAt)}</span>
                    <span className="min-w-0 flex-1 truncate">{l.studentId ? sName.get(l.studentId)?.name : cName.get(l.classId)}</span>
                    <span className="truncate text-xs text-ink-3">{l.topic}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Esperando correção</h2>
            {toGrade.length > 0 && <ButtonLink href={`/professor/correcao/${toGrade[0].id}`} className="px-2.5 py-1 text-xs">Corrigir</ButtonLink>}
          </div>
          {toGrade.length === 0 ? (
            <p className="text-sm text-ink-3">Tudo em dia.</p>
          ) : (
            <ul className="divide-y divide-line">
              {toGrade.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link href={`/professor/correcao/${s.id}`} className="flex items-center gap-2 py-2 text-sm hover:underline">
                    <span className="min-w-0 flex-1 truncate">{sName.get(s.studentId)?.name}</span>
                    <span className="truncate text-xs text-ink-3">{asgs.find((a) => a.id === s.assignmentId)?.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Alunos que precisam de atenção</h2>
          {attention.length === 0 ? (
            <p className="text-sm text-ink-3">Ninguém com atividades atrasadas ou média abaixo de 60%.</p>
          ) : (
            <div className="divide-y divide-line">
              {attention.map(({ s, sum }) => (
                <Link key={s.id} href={`/professor/alunos/${s.id}`} className="flex items-center gap-3 py-2 hover:underline">
                  <Avatar name={s.name} color={s.avatarColor} size={30} />
                  <span className="flex-1 text-sm">{s.name}</span>
                  {sum.overdue > 0 && <Badge variant="danger">{sum.overdue} atrasada(s)</Badge>}
                  {sum.average !== null && <Badge variant={scoreVariant(sum.average)}>Média {sum.average}%</Badge>}
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
