import Link from "next/link";
import { Plus } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { withScope } from "@/server/db/repo";
import SubjectFilter from "@/components/teacher/SubjectFilter";
import { Badge, ButtonLink, EmptyState, Notice, PageHeader, Select } from "@/components/ui";
import { TYPE_LABELS, TYPE_SHORT } from "@/lib/question-types";
import { QUESTION_TYPES, type QuestionFilters } from "@/lib/types";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Banco de questões" };

const LIMIT = 200;
const STATUSES = ["active", "published", "draft", "archived"] as const;

type SP = { q?: string; tipo?: string; hab?: string; nivel?: string; tag?: string; status?: string; salva?: string; disciplina?: string };

export default async function QuestoesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { teacher } = await requireTeacher();
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as QuestionFilters["status"]) : "active";
  // Uma transação; a filtragem acontece no banco e a lista não traz conteúdo nem gabarito.
  const { subjectList, subject, list, stats, ps } = await withScope(teacher.id, async (r) => {
    const subjectList = await r.subjects.all();
    const subject = subjectList.find((x) => x.id === sp.disciplina);
    const filters: QuestionFilters = {
      subjectId: subject?.id,
      type: sp.tipo || undefined,
      skill: sp.hab || undefined,
      level: sp.nivel || undefined,
      tag: sp.tag || undefined,
      status,
      text: sp.q?.trim() || undefined,
      limit: LIMIT + 1,
    };
    return {
      subjectList,
      subject,
      list: await r.questions.search(filters),
      stats: await r.questions.stats(subject?.id),
      ps: await r.passages.titles(),
    };
  });
  const truncated = list.length > LIMIT;
  if (truncated) list.length = LIMIT;
  // Habilidades e níveis: da disciplina escolhida, ou de todas (sem repetir).
  const skillOptions = [...new Map((subject ? [subject] : subjectList).flatMap((x) => x.skills).map((k) => [k.key, k])).values()];
  const levelOptions = [...new Map((subject ? [subject] : subjectList).flatMap((x) => x.levels).map((l) => [l.code, l])).values()];
  const skillLabel = (subjectId: string, key: string) =>
    subjectList.find((x) => x.id === subjectId)?.skills.find((k) => k.key === key)?.label ?? key;
  const subjectName = new Map(subjectList.map((x) => [x.id, x.name]));
  const passageTitle = new Map(ps.map((p) => [p.id, p.title]));
  const allTags = stats.tags;

  return (
    <>
      <PageHeader
        title="Banco de questões"
        subtitle={`${stats.active} questões`}
        actions={<ButtonLink href="/professor/questoes/nova"><Plus size={16} /> Nova questão</ButtonLink>}
      />
      {sp.salva && <div className="mb-4"><Notice variant="success">Questão salva.</Notice></div>}
      <SubjectFilter subjects={subjectList} current={subject?.id ?? ""} basePath="/professor/questoes" />

      <form className="mb-4 grid gap-2 rounded-xl border border-line bg-surface p-3 sm:grid-cols-6">
        {subject && <input type="hidden" name="disciplina" value={subject.id} />}
        <input name="q" defaultValue={sp.q} placeholder="Buscar no enunciado" className="rounded-lg border border-line px-3 py-2 text-sm sm:col-span-2" />
        <Select name="tipo" defaultValue={sp.tipo ?? ""}>
          <option value="">Todos os tipos</option>
          {QUESTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </Select>
        <Select name="hab" defaultValue={sp.hab ?? ""}>
          <option value="">Todas as habilidades</option>
          {skillOptions.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
        </Select>
        <Select name="nivel" defaultValue={sp.nivel ?? ""}>
          <option value="">Todos os níveis</option>
          {levelOptions.map((l) => <option key={l.code} value={l.code}>{l.code}</option>)}
        </Select>
        <Select name="status" defaultValue={status}>
          <option value="active">Publicadas e rascunhos</option>
          <option value="published">Só publicadas</option>
          <option value="draft">Só rascunhos</option>
          <option value="archived">Arquivadas</option>
        </Select>
        {allTags.length > 0 && (
          <Select name="tag" defaultValue={sp.tag ?? ""} className="sm:col-span-2">
            <option value="">Todas as etiquetas</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        )}
        <button className="rounded-lg bg-surface-raised px-3 py-2 text-sm font-medium hover:bg-line sm:col-start-6">Filtrar</button>
      </form>

      {truncated && (
        <div className="mb-3">
          <Notice>Mostrando as {LIMIT} questões alteradas mais recentemente. Use os filtros para encontrar as outras.</Notice>
        </div>
      )}
      {list.length === 0 ? (
        <EmptyState title="Nenhuma questão encontrada">
          <Link href="/professor/questoes/nova" className="text-brand">Criar uma questão</Link>
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {list.map((x) => (
            <Link key={x.id} href={`/professor/questoes/${x.id}`} className="flex flex-col gap-1.5 border-b border-line px-4 py-3 last:border-b-0 hover:bg-page">
              <div className="line-clamp-2 text-sm">{x.prompt}</div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="purple">{TYPE_SHORT[x.type]}</Badge>
                {!subject && subjectList.length > 1 && <Badge variant="info">{subjectName.get(x.subjectId)}</Badge>}
                <Badge>{skillLabel(x.subjectId, x.skill)}</Badge>
                {x.level && <Badge variant="info">{x.level}</Badge>}
                {x.passageId && <Badge variant="success">Leitura: {passageTitle.get(x.passageId) ?? "?"}</Badge>}
                {x.status === "draft" && <Badge variant="warning">Rascunho</Badge>}
                {x.tags.map((t) => <span key={t} className="text-xs text-ink-3">#{t}</span>)}
                <span className="ml-auto text-xs text-ink-3">{x.points} pt · {formatDate(x.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
