"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FileText, Plus, Trash2 } from "lucide-react";
import { saveActivity } from "@/server/actions/activities";
import { initialState } from "@/server/actions/state";
import { TYPE_LABELS, TYPE_SHORT } from "@/lib/question-types";
import { QUESTION_TYPES, type Activity, type QuestionType, type ShowAnswers, type Skill, type Subject } from "@/lib/types";
import SubjectPicker from "./SubjectPicker";
import { SHOW_ANSWERS_LABELS } from "@/lib/labels";
import { Badge, Button, Card, Field, Input, Notice, Select, Textarea } from "@/components/ui";

export interface PickerQuestion {
  id: string;
  subjectId: string;
  prompt: string;
  type: QuestionType;
  skill: Skill;
  level: string;
  points: number;
  passageId: string;
  tags: string[];
}

export default function ActivityBuilder({
  activity,
  bank: allQuestions,
  passages: allPassages,
  subjects,
}: {
  activity?: Activity;
  bank: PickerQuestion[];
  passages: { id: string; title: string; subjectId: string }[];
  subjects: Subject[];
}) {
  const [state, action, pending] = useActionState(saveActivity, initialState);
  // A disciplina é escolhida na criação; o banco mostra só as questões dela.
  const [subjectId, setSubjectId] = useState(activity?.subjectId ?? subjects[0]?.id ?? "");
  const subject = subjects.find((x) => x.id === subjectId);
  const bank = useMemo(() => allQuestions.filter((q) => q.subjectId === subjectId), [allQuestions, subjectId]);
  const passages = allPassages.filter((p) => p.subjectId === subjectId);
  const byId = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank]);
  const [title, setTitle] = useState(activity?.title ?? "");
  const [instructions, setInstructions] = useState(activity?.instructions ?? "");
  const [items, setItems] = useState(activity?.items.filter((i) => byId.has(i.questionId)) ?? []);
  const [timeLimitMin, setTimeLimit] = useState(activity?.timeLimitMin ?? 0);
  const [maxAttempts, setMaxAttempts] = useState(activity?.maxAttempts ?? 1);
  const [shuffle, setShuffle] = useState(activity?.shuffle ?? false);
  const [showAnswers, setShowAnswers] = useState<ShowAnswers>(activity?.showAnswers ?? "after_submit");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [skill, setSkill] = useState("");

  const chosen = new Set(items.map((i) => i.questionId));
  const passageTitle = new Map(passages.map((p) => [p.id, p.title]));
  const total = items.reduce((a, i) => a + i.points, 0);
  const results = bank
    .filter((q) => !chosen.has(q.id))
    .filter((q) => !type || q.type === type)
    .filter((q) => !skill || q.skill === skill)
    .filter((q) => !search || q.prompt.toLowerCase().includes(search.toLowerCase()) || q.tags.some((t) => t.includes(search.toLowerCase())))
    .slice(0, 50);

  const add = (q: PickerQuestion) => setItems((xs) => [...xs, { questionId: q.id, points: q.points }]);
  const addPassage = (pid: string) =>
    setItems((xs) => [
      ...xs,
      ...bank.filter((q) => q.passageId === pid && !xs.some((x) => x.questionId === q.id)).map((q) => ({ questionId: q.id, points: q.points })),
    ]);
  const move = (i: number, j: number) =>
    setItems((xs) => {
      if (j < 0 || j >= xs.length) return xs;
      const n = [...xs];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const changeSubject = (id: string) => {
    if (items.length && !window.confirm("Trocar a disciplina remove as questões já escolhidas. Continuar?")) return;
    setSubjectId(id);
    setItems([]);
    setSkill("");
  };

  const payload = JSON.stringify({ id: activity?.id ?? "", subjectId, title, instructions, items, timeLimitMin, maxAttempts, shuffle, showAnswers });

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="payload" value={payload} />
      <Card>
        <div className="grid gap-3 sm:grid-cols-4">
          {subjects.length > 1 && (
            <div className="sm:col-span-4">
              <SubjectPicker
                subjects={subjects}
                value={subjectId}
                onChange={changeSubject}
                name="_subject"
                disabled={!!activity}
                hint={activity ? "A disciplina não muda depois de criada." : undefined}
              />
            </div>
          )}
          <Field label="Título *" className="sm:col-span-4">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Ex.: Past simple: revisão" />
          </Field>
          <Field label="Instruções para o aluno" className="sm:col-span-4">
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={2000} className="min-h-16" />
          </Field>
          <Field label="Tempo limite (min)" hint="0 = sem limite">
            <Input type="number" min={0} max={600} value={timeLimitMin} onChange={(e) => setTimeLimit(Number(e.target.value))} />
          </Field>
          <Field label="Tentativas">
            <Input type="number" min={1} max={10} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} />
          </Field>
          <Field label="Mostrar gabarito">
            <Select value={showAnswers} onChange={(e) => setShowAnswers(e.target.value as ShowAnswers)}>
              {Object.entries(SHOW_ANSWERS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
            Embaralhar questões e alternativas
          </label>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Questões da atividade ({items.length})</h2>
            <span className="text-xs text-ink-2">Total: {total} pt</span>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-ink-3">Adicione questões do banco ao lado.</p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {items.map((it, i) => {
                const q = byId.get(it.questionId)!;
                return (
                  <li key={it.questionId} className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5">
                    <span className="w-5 text-xs text-ink-3">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{q.prompt}</div>
                      <div className="flex gap-1 text-xs text-ink-3">
                        {TYPE_SHORT[q.type]}
                        {q.passageId && <span>· {passageTitle.get(q.passageId)}</span>}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0.5}
                      max={100}
                      step={0.5}
                      value={it.points}
                      aria-label="Pontos"
                      onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, points: Number(e.target.value) } : x)))}
                      className="w-14 rounded-md border border-line px-1.5 py-1 text-xs"
                    />
                    <button type="button" onClick={() => move(i, i - 1)} className="p-1 text-ink-3 hover:text-ink" aria-label="Subir"><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => move(i, i + 1)} className="p-1 text-ink-3 hover:text-ink" aria-label="Descer"><ArrowDown size={14} /></button>
                    <button type="button" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} className="p-1 text-ink-3 hover:text-danger" aria-label="Remover"><Trash2 size={14} /></button>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Banco de questões</h2>
          {passages.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {passages.map((p) => (
                <button key={p.id} type="button" onClick={() => addPassage(p.id)} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs hover:border-brand">
                  <FileText size={12} /> Adicionar leitura: {p.title}
                </button>
              ))}
            </div>
          )}
          <div className="mb-2 grid grid-cols-3 gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" className="rounded-lg border border-line px-2 py-1.5 text-sm" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-line px-2 py-1.5 text-sm">
              <option value="">Tipo</option>
              {QUESTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
            <select value={skill} onChange={(e) => setSkill(e.target.value)} className="rounded-lg border border-line px-2 py-1.5 text-sm">
              <option value="">Habilidade</option>
              {(subject?.skills ?? []).map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </div>
          <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
            {results.length === 0 && <p className="py-4 text-center text-sm text-ink-3">Nenhuma questão disponível.</p>}
            {results.map((q) => (
              <button key={q.id} type="button" onClick={() => add(q)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-page">
                <Plus size={14} className="shrink-0 text-brand" />
                <span className="min-w-0 flex-1 truncate text-sm">{q.prompt}</span>
                <Badge variant="purple">{TYPE_SHORT[q.type]}</Badge>
                {q.level && <Badge variant="info">{q.level}</Badge>}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">Só aparecem questões publicadas.</p>
        </Card>
      </div>

      {state.error && <Notice variant="danger">{state.error}</Notice>}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : activity ? "Salvar atividade" : "Criar atividade"}</Button>
      </div>
    </form>
  );
}
