"use client";

import { Plus, Trash2 } from "lucide-react";
import { parseTemplate, type Sources } from "@/lib/question-types";
import type { QuestionType } from "@/lib/types";
import { Button, Field, Input, Textarea } from "@/components/ui";

type AnySource = Sources[QuestionType];

function ListEditor({
  items,
  onChange,
  min = 1,
  max = 12,
  placeholder,
  addLabel,
  render,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  min?: number;
  max?: number;
  placeholder?: (i: number) => string;
  addLabel: string;
  render?: (i: number) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          {render?.(i)}
          <Input value={it} placeholder={placeholder?.(i)} maxLength={300} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button
            type="button"
            className="rounded p-1.5 text-ink-3 hover:bg-surface-raised hover:text-danger disabled:opacity-30"
            disabled={items.length <= min}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label="Remover"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {items.length < max && (
        <div>
          <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => onChange([...items, ""])}>
            <Plus size={14} /> {addLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SourceEditor({
  type,
  source,
  onChange,
}: {
  type: QuestionType;
  source: AnySource;
  onChange: (s: AnySource) => void;
}) {
  switch (type) {
    case "single_choice": {
      const s = source as Sources["single_choice"];
      return (
        <Field label="Alternativas (marque a correta)">
          <ListEditor
            items={s.options}
            min={2}
            max={6}
            addLabel="Alternativa"
            placeholder={(i) => `Alternativa ${String.fromCharCode(97 + i)}`}
            onChange={(options) => onChange({ options, correct: Math.min(s.correct, options.length - 1) })}
            render={(i) => (
              <input type="radio" name="correct" checked={s.correct === i} onChange={() => onChange({ ...s, correct: i })} aria-label="Correta" />
            )}
          />
        </Field>
      );
    }
    case "multiple_choice": {
      const s = source as Sources["multiple_choice"];
      const toggle = (i: number) =>
        onChange({ ...s, correct: s.correct.includes(i) ? s.correct.filter((x) => x !== i) : [...s.correct, i] });
      return (
        <div className="flex flex-col gap-3">
          <Field label="Alternativas (marque todas as corretas)">
            <ListEditor
              items={s.options}
              min={2}
              max={8}
              addLabel="Alternativa"
              placeholder={(i) => `Alternativa ${String.fromCharCode(97 + i)}`}
              onChange={(options) => onChange({ ...s, options, correct: s.correct.filter((x) => x < options.length) })}
              render={(i) => <input type="checkbox" checked={s.correct.includes(i)} onChange={() => toggle(i)} aria-label="Correta" />}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.partial} onChange={(e) => onChange({ ...s, partial: e.target.checked })} />
            Pontuação parcial (cada acerto soma, cada erro desconta)
          </label>
        </div>
      );
    }
    case "true_false": {
      const s = source as Sources["true_false"];
      return (
        <Field label="Afirmações">
          <div className="flex flex-col gap-2">
            {s.statements.map((st, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={st.text}
                  maxLength={300}
                  placeholder={`Afirmação ${i + 1}`}
                  onChange={(e) => onChange({ statements: s.statements.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                />
                {[true, false].map((b) => (
                  <button
                    key={String(b)}
                    type="button"
                    onClick={() => onChange({ statements: s.statements.map((x, j) => (j === i ? { ...x, answer: b } : x)) })}
                    className={`w-9 shrink-0 rounded-md border py-1.5 text-xs font-semibold ${st.answer === b ? "border-brand bg-brand text-white" : "border-line text-ink-2"}`}
                  >
                    {b ? "V" : "F"}
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded p-1.5 text-ink-3 hover:text-danger disabled:opacity-30"
                  disabled={s.statements.length <= 1}
                  onClick={() => onChange({ statements: s.statements.filter((_, j) => j !== i) })}
                  aria-label="Remover"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {s.statements.length < 12 && (
              <div>
                <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => onChange({ statements: [...s.statements, { text: "", answer: true }] })}>
                  <Plus size={14} /> Afirmação
                </Button>
              </div>
            )}
          </div>
        </Field>
      );
    }
    case "fill_text":
    case "fill_choice": {
      const s = source as Sources["fill_text"] & Partial<Sources["fill_choice"]>;
      const { answers } = parseTemplate(s.template);
      return (
        <div className="flex flex-col gap-3">
          <Field
            label="Texto com lacunas"
            hint={
              <>
                Coloque cada resposta entre colchetes duplos: <code>I [[went]] home.</code>
                {type === "fill_text" && <> Para aceitar mais de uma resposta: <code>[[don&apos;t|do not]]</code>.</>}
              </>
            }
          >
            <Textarea
              value={s.template}
              maxLength={4000}
              className="min-h-32 font-mono text-[13px]"
              placeholder="Yesterday I [[went]] to the market and [[bought|got]] some apples."
              onChange={(e) => onChange({ ...s, template: e.target.value } as AnySource)}
            />
          </Field>
          <p className="text-xs text-ink-2">
            {answers.length} lacuna(s)
            {answers.length > 0 && `: ${answers.map((a) => a.join(" / ") || "(vazia)").join(" · ")}`}
          </p>
          {type === "fill_text" ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={s.caseSensitive} onChange={(e) => onChange({ template: s.template, caseSensitive: e.target.checked })} />
              Diferenciar maiúsculas e minúsculas
            </label>
          ) : (
            <Field label="Palavras extras (distratores)" hint="Aparecem nas opções junto com as respostas certas.">
              <ListEditor
                items={s.distractors?.length ? s.distractors : [""]}
                addLabel="Distrator"
                onChange={(distractors) => onChange({ template: s.template, distractors })}
              />
            </Field>
          )}
        </div>
      );
    }
    case "matching": {
      const s = source as Sources["matching"];
      return (
        <div className="flex flex-col gap-3">
          <Field label="Pares (coluna A → coluna B)">
            <div className="flex flex-col gap-2">
              {s.pairs.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={p.left} maxLength={200} placeholder="Coluna A" onChange={(e) => onChange({ ...s, pairs: s.pairs.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)) })} />
                  <span className="text-ink-3">→</span>
                  <Input value={p.right} maxLength={200} placeholder="Coluna B" onChange={(e) => onChange({ ...s, pairs: s.pairs.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)) })} />
                  <button type="button" className="rounded p-1.5 text-ink-3 hover:text-danger disabled:opacity-30" disabled={s.pairs.length <= 2} onClick={() => onChange({ ...s, pairs: s.pairs.filter((_, j) => j !== i) })} aria-label="Remover">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {s.pairs.length < 12 && (
                <div>
                  <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => onChange({ ...s, pairs: [...s.pairs, { left: "", right: "" }] })}>
                    <Plus size={14} /> Par
                  </Button>
                </div>
              )}
            </div>
          </Field>
          <Field label="Itens extras na coluna B (opcional)">
            <ListEditor items={s.distractors.length ? s.distractors : [""]} addLabel="Item extra" onChange={(distractors) => onChange({ ...s, distractors })} />
          </Field>
        </div>
      );
    }
    case "ordering": {
      const s = source as Sources["ordering"];
      return (
        <div className="flex flex-col gap-3">
          <Field label="Itens na ordem CORRETA" hint="O sistema embaralha para o aluno.">
            <ListEditor items={s.items} min={2} max={15} addLabel="Item" placeholder={(i) => `Item ${i + 1}`} onChange={(items) => onChange({ ...s, items })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.joiner === "newline"} onChange={(e) => onChange({ ...s, joiner: e.target.checked ? "newline" : "space" })} />
            São frases de um texto (mostrar uma por linha)
          </label>
        </div>
      );
    }
    case "open": {
      const s = source as Sources["open"];
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mínimo de palavras" hint="0 = sem limite">
            <Input type="number" min={0} max={5000} value={s.minWords} onChange={(e) => onChange({ ...s, minWords: Number(e.target.value) })} />
          </Field>
          <Field label="Máximo de palavras" hint="0 = sem limite">
            <Input type="number" min={0} max={5000} value={s.maxWords} onChange={(e) => onChange({ ...s, maxWords: Number(e.target.value) })} />
          </Field>
          <Field label="Critérios de correção (o aluno vê)" className="sm:col-span-2">
            <Textarea value={s.rubric} maxLength={1000} className="min-h-16" onChange={(e) => onChange({ ...s, rubric: e.target.value })} />
          </Field>
          <Field label="Resposta-modelo (só você vê, e o aluno depois da correção)" className="sm:col-span-2">
            <Textarea value={s.modelAnswer} maxLength={4000} className="min-h-16" onChange={(e) => onChange({ ...s, modelAnswer: e.target.value })} />
          </Field>
        </div>
      );
    }
  }
}
