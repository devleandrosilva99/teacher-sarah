"use client";

import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { countWords, type Contents, type Responses } from "@/lib/question-types";
import type { PublicQuestion } from "@/lib/types";
import { cx } from "@/components/ui";
import { isAudioUrl } from "@/lib/files";
import FileAnswer, { type FileInfo } from "./FileAnswer";

type Value = Record<string, unknown>;

export function Media({ url }: { url: string }) {
  if (!url) return null;
  if (isAudioUrl(url)) {
    return <audio controls src={url} className="my-2 w-full" preload="none" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="my-2 max-h-72 rounded-lg border border-line object-contain" />;
}

function Mark({ ok }: { ok: boolean | undefined }) {
  if (ok === undefined) return null;
  return ok ? (
    <Check size={16} className="shrink-0 text-success" aria-label="Correto" />
  ) : (
    <X size={16} className="shrink-0 text-danger" aria-label="Incorreto" />
  );
}

export default function QuestionPlayer({
  question,
  value,
  onChange,
  readOnly = false,
  detail,
  correctIds,
  files,
  submissionId,
}: {
  question: PublicQuestion;
  value: Value;
  onChange?: (v: Value) => void;
  readOnly?: boolean;
  /** Acerto por item, mostrado na revisão. */
  detail?: Record<string, boolean>;
  /** Alternativas corretas (revisão de múltipla escolha). */
  correctIds?: string[];
  /** Nomes e tamanhos dos arquivos já enviados (entrega de arquivo). */
  files?: Record<string, FileInfo>;
  /** Tentativa aberta: permite anexar arquivos (entrega de arquivo). */
  submissionId?: string;
}) {
  const set = (v: Value) => !readOnly && onChange?.(v);
  const name = `q-${question.id}`;

  switch (question.type) {
    case "single_choice":
    case "multiple_choice": {
      const c = question.content as Contents["multiple_choice"];
      const multi = question.type === "multiple_choice";
      const chosen = multi
        ? new Set((value as Responses["multiple_choice"]).choices ?? [])
        : new Set([(value as Responses["single_choice"]).choice].filter(Boolean) as string[]);
      return (
        <div className="flex flex-col gap-2">
          {multi && <p className="text-xs text-ink-3">Marque {c.selectCount} alternativa(s).</p>}
          {c.options.map((o, i) => {
            const isOn = chosen.has(o.id);
            const isCorrect = correctIds?.includes(o.id);
            return (
              <label
                key={o.id}
                className={cx(
                  "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm",
                  isOn ? "border-brand bg-brand-soft" : "border-line bg-surface",
                  !readOnly && "cursor-pointer hover:border-brand",
                  correctIds && isCorrect && "ring-2 ring-success/50"
                )}
              >
                <input
                  type={multi ? "checkbox" : "radio"}
                  name={name}
                  className="mt-0.5"
                  checked={isOn}
                  disabled={readOnly}
                  onChange={() => {
                    if (multi) {
                      const next = new Set(chosen);
                      if (next.has(o.id)) next.delete(o.id);
                      else next.add(o.id);
                      set({ choices: [...next] });
                    } else set({ choice: o.id });
                  }}
                />
                <span className="w-5 shrink-0 font-medium text-ink-3">{String.fromCharCode(97 + i)})</span>
                <span className="flex-1">{o.text}</span>
                {correctIds && isCorrect && <Check size={16} className="text-success" />}
              </label>
            );
          })}
        </div>
      );
    }

    case "true_false": {
      const c = question.content as Contents["true_false"];
      const answers = (value as Responses["true_false"]).answers ?? {};
      return (
        <div className="flex flex-col gap-2">
          {c.statements.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
              <span className="flex-1">{s.text}</span>
              <Mark ok={detail?.[s.id]} />
              {[true, false].map((b) => (
                <button
                  key={String(b)}
                  type="button"
                  disabled={readOnly}
                  onClick={() => set({ answers: { ...answers, [s.id]: b } })}
                  className={cx(
                    "w-9 rounded-md border py-1 text-xs font-semibold",
                    answers[s.id] === b ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-2",
                    !readOnly && "hover:border-brand"
                  )}
                  aria-pressed={answers[s.id] === b}
                >
                  {b ? "V" : "F"}
                </button>
              ))}
            </div>
          ))}
        </div>
      );
    }

    case "fill_text":
    case "fill_choice": {
      const c = question.content as Contents["fill_choice"];
      const blanks = (value as Responses["fill_text"]).blanks ?? {};
      const choice = question.type === "fill_choice";
      return (
        <div>
          {choice && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {c.bank.map((w) => (
                <span key={w} className="rounded-md bg-surface-raised px-2 py-0.5 text-xs text-ink-2">{w}</span>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm leading-9">
            {c.segments.map((seg, i) =>
              seg.t === "text" ? (
                <span key={i}>{seg.v}</span>
              ) : (
                <span key={i} className="inline-flex items-center gap-0.5 align-middle">
                  {choice ? (
                    <select
                      aria-label={`Lacuna ${seg.id.slice(1)}`}
                      disabled={readOnly}
                      value={blanks[seg.id] ?? ""}
                      onChange={(e) => set({ blanks: { ...blanks, [seg.id]: e.target.value } })}
                      className="mx-1 rounded-md border border-line bg-surface px-1.5 py-1 text-sm"
                    >
                      <option value="">——</option>
                      {c.bank.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  ) : (
                    <input
                      aria-label={`Lacuna ${seg.id.slice(1)}`}
                      disabled={readOnly}
                      value={blanks[seg.id] ?? ""}
                      onChange={(e) => set({ blanks: { ...blanks, [seg.id]: e.target.value } })}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className="mx-1 w-32 rounded-md border-0 border-b-2 border-ink-3 bg-brand-soft/50 px-1.5 py-0.5 text-sm focus:border-brand focus:outline-none"
                    />
                  )}
                  <Mark ok={detail?.[seg.id]} />
                </span>
              )
            )}
          </p>
        </div>
      );
    }

    case "matching": {
      const c = question.content as Contents["matching"];
      const pairs = (value as Responses["matching"]).pairs ?? {};
      return (
        <div className="flex flex-col gap-2">
          {c.left.map((l) => (
            <div key={l.id} className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm sm:flex-row sm:items-center">
              <span className="flex-1 font-medium">{l.text}</span>
              <div className="flex items-center gap-2">
                <select
                  disabled={readOnly}
                  value={pairs[l.id] ?? ""}
                  onChange={(e) => set({ pairs: { ...pairs, [l.id]: e.target.value } })}
                  className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm sm:w-56"
                  aria-label={`Par para ${l.text}`}
                >
                  <option value="">Escolha...</option>
                  {c.right.map((r) => <option key={r.id} value={r.id}>{r.text}</option>)}
                </select>
                <Mark ok={detail?.[l.id]} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    case "ordering": {
      const c = question.content as Contents["ordering"];
      const order = (value as Responses["ordering"]).order ?? c.items.map((i) => i.id);
      const items = order.map((id) => c.items.find((i) => i.id === id)).filter(Boolean) as typeof c.items;
      const move = (from: number, to: number) => {
        if (to < 0 || to >= order.length) return;
        const next = [...order];
        [next[from], next[to]] = [next[to], next[from]];
        set({ order: next });
      };
      return (
        <div>
          <ol className="flex flex-col gap-1.5">
            {items.map((it, i) => (
              <li key={it.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                <span className="w-5 text-xs text-ink-3">{i + 1}.</span>
                <span className="flex-1">{it.text}</span>
                {!readOnly && (
                  <>
                    <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded p-1 text-ink-2 hover:bg-surface-raised disabled:opacity-30" aria-label="Subir">
                      <ArrowUp size={15} />
                    </button>
                    <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className="rounded p-1 text-ink-2 hover:bg-surface-raised disabled:opacity-30" aria-label="Descer">
                      <ArrowDown size={15} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-sm text-ink-2">
            <span className="text-xs text-ink-3">Fica assim: </span>
            {items.map((i) => i.text).join(c.joiner === "newline" ? " / " : " ")}
          </p>
        </div>
      );
    }

    case "open": {
      const c = question.content as Contents["open"];
      const text = (value as Responses["open"]).text ?? "";
      const words = countWords(text);
      const out = (c.minWords && words < c.minWords) || (c.maxWords && words > c.maxWords);
      return (
        <div>
          {c.rubric && <p className="mb-2 text-xs text-ink-3">Critérios: {c.rubric}</p>}
          <textarea
            value={text}
            readOnly={readOnly}
            onChange={(e) => set({ text: e.target.value })}
            className="min-h-36 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
            placeholder="Escreva sua resposta..."
            maxLength={10000}
          />
          <p className={cx("mt-1 text-xs", out ? "text-warn" : "text-ink-3")}>
            {words} palavra(s)
            {c.minWords || c.maxWords ? ` · esperado: ${c.minWords ? `mín. ${c.minWords}` : ""}${c.minWords && c.maxWords ? ", " : ""}${c.maxWords ? `máx. ${c.maxWords}` : ""}` : ""}
          </p>
        </div>
      );
    }

    case "file_upload": {
      const ids = ((value as Responses["file_upload"]).fileIds ?? []).map(String);
      return (
        <FileAnswer
          questionId={question.id}
          content={question.content as Contents["file_upload"]}
          fileIds={ids}
          files={files}
          submissionId={readOnly ? undefined : submissionId}
          onChange={readOnly ? undefined : (next) => set({ fileIds: next })}
        />
      );
    }
  }
}
