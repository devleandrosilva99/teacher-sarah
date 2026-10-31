"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Clock } from "lucide-react";
import { saveDraft, submitAttempt } from "@/server/actions/student";
import { isAnswered } from "@/lib/question-types";
import type { Passage, PublicQuestion } from "@/lib/types";
import QuestionPlayer, { Media } from "@/components/questions/QuestionPlayer";
import type { FileInfo } from "@/components/questions/FileAnswer";
import { Button, Notice, cx } from "@/components/ui";

type Responses = Record<string, Record<string, unknown>>;

function PassagePanel({ passage }: { passage: Passage }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
      <div className="mb-1 text-xs font-medium text-ink-3">{passage.kind === "reading" ? "Leia o texto" : "Ouça o áudio"}</div>
      <h3 className="mb-2 font-semibold">{passage.title}</h3>
      {passage.kind === "listening" && passage.audioUrl && <audio controls src={passage.audioUrl} className="mb-2 w-full" />}
      {passage.kind === "reading" && <p className="whitespace-pre-wrap text-sm leading-relaxed">{passage.text}</p>}
      {passage.source && <p className="mt-3 text-xs text-ink-3">Fonte: {passage.source}</p>}
    </div>
  );
}

export default function ActivityPlayer({
  submissionId,
  title,
  instructions,
  questions,
  passages,
  initial,
  deadline,
  files,
}: {
  submissionId: string;
  title: string;
  instructions: string;
  questions: PublicQuestion[];
  passages: Passage[];
  initial: Responses;
  deadline: number | null;
  /** Arquivos já anexados nesta tentativa (entrega de arquivo). */
  files?: Record<string, FileInfo>;
}) {
  const [responses, setResponses] = useState<Responses>(initial);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(deadline ? deadline - Date.now() : null);
  const [submitting, startSubmit] = useTransition();
  const dirty = useRef(false);
  const latest = useRef(responses);
  latest.current = responses;

  const answered = questions.filter((q) => isAnswered(q.type, responses[q.id])).length;

  const save = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    setSaveState("saving");
    const r = await saveDraft(submissionId, latest.current);
    setSaveState(r.ok ? "saved" : "error");
    if (!r.ok && r.error) setError(r.error);
  }, [submissionId]);

  // Salva automaticamente 1,5 s depois da última mudança.
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(save, 1500);
    return () => clearTimeout(t);
  }, [responses, save]);

  const submit = useCallback(
    (force = false) => {
      if (!force) {
        const missing = questions.length - answered;
        const msg = missing > 0 ? `Ainda faltam ${missing} questão(ões) sem resposta. Entregar mesmo assim?` : "Entregar a atividade? Depois não dá para mudar as respostas.";
        if (!window.confirm(msg)) return;
      }
      startSubmit(async () => {
        const r = await submitAttempt(submissionId, latest.current);
        if (r?.error) setError(r.error);
      });
    },
    [answered, questions.length, submissionId]
  );

  // Cronômetro: entrega sozinho quando o tempo acaba.
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => {
      const left = deadline - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        submit(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, submit]);

  // Avisa antes de sair com alterações não salvas.
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  const change = (qid: string, v: Record<string, unknown>) => {
    dirty.current = true;
    setSaveState("idle");
    setResponses((r) => ({ ...r, [qid]: v }));
  };

  // Agrupa questões consecutivas do mesmo texto.
  const groups: { passage?: Passage; items: { q: PublicQuestion; n: number }[] }[] = [];
  questions.forEach((q, i) => {
    const last = groups[groups.length - 1];
    if (last && q.passageId && last.passage?.id === q.passageId) last.items.push({ q, n: i + 1 });
    else groups.push({ passage: passages.find((p) => p.id === q.passageId), items: [{ q, n: i + 1 }] });
  });

  const mm = remaining !== null ? Math.max(0, Math.floor(remaining / 60000)) : 0;
  const ss = remaining !== null ? Math.max(0, Math.floor((remaining % 60000) / 1000)) : 0;

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-line bg-page/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{title}</div>
            <div className="text-xs text-ink-3">
              {answered}/{questions.length} respondidas ·{" "}
              {saveState === "saving" ? "salvando..." : saveState === "saved" ? "rascunho salvo" : saveState === "error" ? "erro ao salvar" : "as respostas são salvas automaticamente"}
            </div>
          </div>
          {remaining !== null && (
            <span className={cx("flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium tabular-nums", remaining < 60_000 ? "bg-danger-bg text-danger" : "bg-surface-raised")}>
              <Clock size={14} /> {mm}:{String(ss).padStart(2, "0")}
            </span>
          )}
          <Button onClick={() => submit()} disabled={submitting}>{submitting ? "Entregando..." : "Entregar"}</Button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-raised">
          <div className="h-full bg-brand transition-all" style={{ width: `${(answered / Math.max(1, questions.length)) * 100}%` }} />
        </div>
      </div>

      {instructions && <div className="mb-4"><Notice>{instructions}</Notice></div>}
      {error && <div className="mb-4"><Notice variant="danger">{error}</Notice></div>}

      <div className="flex flex-col gap-6">
        {groups.map((g, gi) => (
          <div key={gi} className={cx(g.passage && "grid gap-4 lg:grid-cols-2")}>
            {g.passage && <div><PassagePanel passage={g.passage} /></div>}
            <div className="flex flex-col gap-4">
              {g.items.map(({ q, n }) => (
                <div key={q.id} id={`q${n}`} className="rounded-xl border border-line bg-surface p-4">
                  <div className="mb-3 flex items-start gap-2">
                    <span className="text-sm font-medium text-ink-3">{n}.</span>
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap text-sm font-medium">{q.prompt}</p>
                      {q.instructions && <p className="mt-0.5 text-xs text-ink-2">{q.instructions}</p>}
                    </div>
                    <span className="text-xs text-ink-3">{q.points} pt</span>
                  </div>
                  <Media url={q.mediaUrl} />
                  <QuestionPlayer question={q} value={responses[q.id] ?? {}} onChange={(v) => change(q.id, v)} files={files} submissionId={submissionId} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => submit()} disabled={submitting}>{submitting ? "Entregando..." : "Entregar atividade"}</Button>
      </div>
    </div>
  );
}
