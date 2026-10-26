import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Download, Mail, Pencil, RotateCcw } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { withScope } from "@/server/db/repo";
import { rowFor, summarize } from "@/server/services/assignments";
import { createInvite, deleteStudent, emailInvite, setStudentStatus } from "@/server/actions/students";
import { MAIL_UNAVAILABLE, mailAvailable } from "@/server/mail";
import { baseUrl } from "@/server/url";
import { Avatar, Badge, Button, ButtonLink, Card, EmptyState, Notice, PageHeader, Stat, scoreVariant } from "@/components/ui";
import CopyField from "@/components/CopyField";
import WhatsAppButton from "@/components/WhatsAppButton";
import { inviteMessage } from "@/lib/whatsapp";
import ConfirmButton from "@/components/ConfirmButton";
import { ScoreHistory, SkillBars } from "@/components/charts";
import { ASSIGNMENT_STATUS } from "@/lib/labels";
import { formatDate, formatDateTime, formatWeekdayTime } from "@/lib/format";

export default async function AlunoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string; email?: string }>;
}) {
  const { teacher } = await requireTeacher();
  const { id } = await params;
  const { novo, email: emailResult } = await searchParams;
  // Uma transação, só com os dados deste aluno. Os envios vêm completos
  // (com as questões) porque o desempenho por habilidade precisa delas.
  const [data, base] = await Promise.all([
    withScope(teacher.id, async (r) => {
      const student = await r.students.get(id);
      if (!student) return null;
      return {
        student,
        asgs: await r.assignments.forStudent(id),
        subs: await r.submissions.forStudent(id),
        myLessons: await r.lessons.forStudent(id),
        allClasses: await r.classes.all(),
        invite: await r.invitations.validForStudent(id),
        subjectList: await r.subjects.all(),
      };
    }),
    baseUrl(),
  ]);
  if (!data) notFound();
  const { student, asgs, subs, allClasses, invite, subjectList } = data;
  const levelText = subjectList
    .filter((x) => student.levels[x.id])
    .map((x) => {
      const code = student.levels[x.id];
      const label = x.levels.find((l) => l.code === code)?.label ?? "";
      return subjectList.length > 1 ? `${x.name}: ${code}` : `${code} · ${label}`;
    })
    .join(" · ");
  const rows = asgs
    .map((a) => rowFor(a, id, subs))
    .sort((a, b) => b.assignment.createdAt.localeCompare(a.assignment.createdAt));
  const sum = summarize(rows);
  const myClasses = allClasses.filter((c) => c.studentIds.includes(id));
  const myLessons = [...data.myLessons].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const archived = student.status === "archived";

  return (
    <>
      <PageHeader
        back={{ href: "/professor/alunos", label: "Alunos" }}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={student.name} color={student.avatarColor} size={40} />
            {student.name}
          </span>
        }
        subtitle={`${levelText}${student.goal ? ` · ${student.goal}` : ""}`}
        actions={
          <>
            <ButtonLink href={`/professor/alunos/${id}/editar`} variant="secondary">
              <Pencil size={15} /> Editar
            </ButtonLink>
            <ButtonLink href={`/professor/atividades?atribuir=aluno:${id}`} variant="secondary">
              Passar atividade
            </ButtonLink>
          </>
        }
      />

      {novo && <div className="mb-4"><Notice variant="success">Aluno cadastrado. Agora gere o link de acesso abaixo e envie para ele.</Notice></div>}
      {archived && <div className="mb-4"><Notice variant="warning">Aluno arquivado: ele não consegue mais entrar. O histórico continua guardado.</Notice></div>}
      {student.deletionRequestedAt && (
        <div className="mb-4">
          <Notice variant="danger">
            O aluno pediu a exclusão dos dados em {formatDate(student.deletionRequestedAt)}. Exporte o que precisar e use &quot;Excluir definitivamente&quot; no fim da página.
          </Notice>
        </div>
      )}

      {!archived && (
        <Card className="mb-4">
          <h2 className="text-sm font-semibold">Acesso do aluno</h2>
          {student.userId && !invite ? (
            <p className="mt-1 text-sm text-ink-2">
              Conta ativa. O aluno entra com <span className="font-medium text-ink">{student.email}</span> em <span className="font-medium text-ink">{base}/p/{teacher.slug}</span>.
              Se ele esquecer a senha, gere um novo link.
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-2">
              {invite ? "Envie este link ao aluno (vale por 7 dias, uso único):" : "O aluno ainda não tem acesso. Gere um link e envie por WhatsApp ou e-mail."}
            </p>
          )}
          {invite && <div className="mt-3"><CopyField value={`${base}/convite/${invite.token}`} /></div>}
          {emailResult && (
            <div className="mt-3">
              {emailResult === "enviado" ? (
                <Notice variant="success">Link enviado para {student.email}.</Notice>
              ) : (
                <Notice variant="danger">{emailResult === "indisponivel" ? MAIL_UNAVAILABLE : "Não foi possível enviar o e-mail agora. Copie o link e envie por outro meio."}</Notice>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={createInvite.bind(null, id)}>
              <Button variant="secondary" type="submit">
                {invite ? "Gerar outro link" : student.userId ? "Gerar link para nova senha" : "Gerar link de acesso"}
              </Button>
            </form>
            {invite && (
              <WhatsAppButton phone={student.phone} text={inviteMessage(student.name, teacher.name, `${base}/convite/${invite.token}`, invite.expiresAt)} />
            )}
            {(invite || !student.userId) && mailAvailable() && (
              <form action={emailInvite.bind(null, id)}>
                <Button variant="secondary" type="submit">
                  <Mail size={15} /> Enviar por e-mail
                </Button>
              </form>
            )}
          </div>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Média geral" value={sum.average !== null ? `${sum.average}%` : "—"} />
        <Stat label="Atividades feitas" value={`${sum.completed}/${sum.total}`} />
        <Stat label="Pendentes" value={sum.pending} />
        <Stat label="Atrasadas" value={sum.overdue} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold">Evolução das notas (%)</h2>
          <ScoreHistory points={sum.history} />
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Por habilidade</h2>
          <SkillBars skills={sum.bySkill} />
        </Card>
      </div>

      <Card className="mb-4">
        <h2 className="mb-3 text-sm font-semibold">Atividades</h2>
        {rows.length === 0 ? (
          <EmptyState title="Nenhuma atividade atribuída" />
        ) : (
          <div className="divide-y divide-line">
            {rows.map((r) => (
              <div key={r.assignment.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link href={`/professor/atividades/${r.assignment.activityId}`} className="text-sm font-medium hover:underline">
                    {r.assignment.title}
                  </Link>
                  <div className="text-xs text-ink-3">
                    {r.assignment.dueAt ? `Prazo ${formatDateTime(r.assignment.dueAt)}` : "Sem prazo"} · {r.attempts.length} tentativa(s)
                  </div>
                </div>
                <Badge variant={ASSIGNMENT_STATUS[r.status].variant}>{ASSIGNMENT_STATUS[r.status].label}</Badge>
                {r.percent !== null && <Badge variant={scoreVariant(r.percent)}>{r.percent}%</Badge>}
                {r.best && (
                  <ButtonLink href={`/professor/correcao/${r.best.id}`} variant="ghost" className="px-2 py-1 text-xs">
                    Ver respostas
                  </ButtonLink>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Aulas</h2>
          {myLessons.length === 0 ? (
            <p className="text-sm text-ink-3">Nenhuma aula registrada.</p>
          ) : (
            <ul className="divide-y divide-line">
              {myLessons.slice(0, 8).map((l) => (
                <li key={l.id} className="py-2">
                  <Link href={`/professor/agenda/${l.id}`} className="flex items-center justify-between gap-2 text-sm hover:underline">
                    <span className="truncate">{l.topic || "Aula"}</span>
                    <span className="shrink-0 text-xs text-ink-3">{formatWeekdayTime(l.startsAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Dados</h2>
          <dl className="grid grid-cols-3 gap-y-1.5 text-sm">
            <dt className="text-ink-3">E-mail</dt><dd className="col-span-2 truncate">{student.email}</dd>
            <dt className="text-ink-3">Telefone</dt><dd className="col-span-2">{student.phone || "—"}</dd>
            <dt className="text-ink-3">Nascimento</dt><dd className="col-span-2">{student.birthDate ? formatDate(student.birthDate + "T12:00:00Z") : "—"}</dd>
            {student.guardianName && (<><dt className="text-ink-3">Responsável</dt><dd className="col-span-2">{student.guardianName}</dd></>)}
            <dt className="text-ink-3">Cidade</dt><dd className="col-span-2">{[student.city, student.state].filter(Boolean).join(" / ") || "—"}</dd>
            <dt className="text-ink-3">Turmas</dt><dd className="col-span-2">{myClasses.map((c) => c.name).join(", ") || "—"}</dd>
          </dl>
          {student.notes && (
            <div className="mt-3 rounded-lg bg-warn-bg/60 p-3 text-sm text-warn-fg">
              <div className="mb-1 text-xs font-medium">Anotações privadas</div>
              <p className="whitespace-pre-wrap">{student.notes}</p>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Gerenciar</h2>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/professor/alunos/${id}/exportar`} variant="secondary" prefetch={false}>
            <Download size={15} /> Exportar dados (JSON)
          </ButtonLink>
          <form action={setStudentStatus.bind(null, id, archived ? "active" : "archived")}>
            <Button variant="secondary" type="submit">
              {archived ? <><RotateCcw size={15} /> Reativar</> : <><Archive size={15} /> Arquivar</>}
            </Button>
          </form>
          <form action={deleteStudent.bind(null, id)}>
            <ConfirmButton variant="danger" message={`Excluir ${student.name} e todo o histórico dele? Não dá para desfazer.`}>
              Excluir definitivamente
            </ConfirmButton>
          </form>
        </div>
      </Card>
    </>
  );
}
