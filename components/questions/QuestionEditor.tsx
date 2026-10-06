"use client";

import { useActionState, useMemo, useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { saveQuestion } from "@/server/actions/questions";
import { initialState } from "@/server/actions/state";
import { buildQuestion, emptySource, TYPE_LABELS, type Sources } from "@/lib/question-types";
import { LEVELS, QUESTION_TYPES, SKILLS, SKILL_LABELS, type Level, type Question, type QuestionType, type Skill } from "@/lib/types";
import { Button, Card, Field, Input, Notice, Select, Textarea, cx } from "@/components/ui";
import SourceEditor from "./SourceEditors";
import QuestionPlayer, { Media } from "./QuestionPlayer";

interface PassageOption {
  id: string;
  title: string;
}

export default function QuestionEditor({
  question,
  passages,
  defaultPassageId = "",
  next = "",
}: {
  question?: Question;
  passages: PassageOption[];
  defaultPassageId?: string;
  next?: string;
}) {
  const [state, action, pending] = useActionState(saveQuestion, initialState);
  const [type, setType] = useState<QuestionType>(question?.type ?? "single_choice");
  const [source, setSource] = useState<Sources[QuestionType]>((question?.source as Sources[QuestionType]) ?? emptySource("single_choice"));
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [instructions, setInstructions] = useState(question?.instructions ?? "");
  const [mediaUrl, setMediaUrl] = useState(question?.mediaUrl ?? "");
  const [passageId, setPassageId] = useState(question?.passageId ?? defaultPassageId);
  const [level, setLevel] = useState<Level | "">(question?.level ?? "");
  const [skill, setSkill] = useState<Skill>(question?.skill ?? (defaultPassageId ? "reading" : "grammar"));
  const [tags, setTags] = useState((question?.tags ?? []).join(", "));
  const [points, setPoints] = useState(question?.points ?? (type === "open" ? 2 : 1));
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [preview, setPreview] = useState(false);
  const [previewValue, setPreviewValue] = useState<Record<string, unknown>>({});

  const built = useMemo(() => buildQuestion(type, source), [type, source]);

  function changeType(t: QuestionType) {
    setType(t);
    setSource(emptySource(t));
    setPreviewValue({});
    if (t === "open" && points === 1) setPoints(2);
  }

  const payload = JSON.stringify({
    id: question?.id ?? "",
    type,
    prompt,
    instructions,
    mediaUrl,
    passageId,
    level,
    skill,
    tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    points,
    explanation,
    source,
    next,
  });

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="payload" value={payload} />

      <Card>
        <Field label="Tipo de questão">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {QUESTION_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changeType(t)}
                disabled={!!question}
                className={cx(
                  "rounded-lg border px-2 py-2 text-left text-xs",
                  type === t ? "border-brand bg-brand-soft font-medium text-brand-ink" : "border-line hover:border-brand",
                  question && type !== t && "opacity-40"
                )}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </Field>
        {question && <p className="mt-2 text-xs text-ink-3">O tipo não muda depois de criado. Para outro tipo, crie uma questão nova.</p>}
      </Card>

      <div className="flex rounded-lg border border-line bg-surface p-0.5 text-sm sm:self-start">
        <button type="button" onClick={() => setPreview(false)} className={cx("flex items-center gap-1.5 rounded-md px-3 py-1.5", !preview && "bg-surface-raised font-medium")}>
          <Pencil size={14} /> Editar
        </button>
        <button type="button" onClick={() => setPreview(true)} className={cx("flex items-center gap-1.5 rounded-md px-3 py-1.5", preview && "bg-surface-raised font-medium")}>
          <Eye size={14} /> Ver como aluno
        </button>
      </div>

      {preview ? (
        <Card>
          {built.ok ? (
            <>
              <p className="whitespace-pre-wrap text-sm font-medium">{prompt || "(sem enunciado)"}</p>
              {instructions && <p className="mt-1 text-xs text-ink-2">{instructions}</p>}
              <Media url={mediaUrl} />
              <div className="mt-3">
                <QuestionPlayer
                  question={{ id: "preview", type, prompt, instructions, mediaUrl, passageId, points, content: built.content }}
                  value={previewValue}
                  onChange={setPreviewValue}
                />
              </div>
            </>
          ) : (
            <Notice variant="warning">{built.error}</Notice>
          )}
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-3">
              <Field label="Enunciado *">
                <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={4000} className="min-h-20" placeholder="Ex.: Choose the correct option." />
              </Field>
              <Field label="Instrução extra (opcional)">
                <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={1000} />
              </Field>
              <Field label="Imagem ou áudio (link, opcional)" hint="Cole um link https de imagem (.jpg, .png) ou áudio (.mp3).">
                <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} maxLength={500} placeholder="https://..." />
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Resposta</h2>
            <SourceEditor type={type} source={source} onChange={setSource} />
            {!built.ok && (prompt || JSON.stringify(source) !== JSON.stringify(emptySource(type))) && (
              <p className="mt-3 text-xs text-warn">{built.error}</p>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Organização</h2>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Habilidade">
                <Select value={skill} onChange={(e) => setSkill(e.target.value as Skill)}>
                  {SKILLS.map((s) => <option key={s} value={s}>{SKILL_LABELS[s]}</option>)}
                </Select>
              </Field>
              <Field label="Nível">
                <Select value={level} onChange={(e) => setLevel(e.target.value as Level | "")}>
                  <option value="">—</option>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Pontos">
                <Input type="number" min={0.5} max={100} step={0.5} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
              </Field>
              <Field label="Texto de leitura">
                <Select value={passageId} onChange={(e) => setPassageId(e.target.value)}>
                  <option value="">Nenhum</option>
                  {passages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </Select>
              </Field>
              <Field label="Etiquetas (separe por vírgula)" className="sm:col-span-4">
                <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="past simple, travel" maxLength={300} />
              </Field>
              <Field label="Explicação (o aluno vê depois da correção)" className="sm:col-span-4">
                <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={2000} className="min-h-16" />
              </Field>
            </div>
          </Card>
        </>
      )}

      {state.error && <Notice variant="danger">{state.error}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="status" value="published" disabled={pending}>
          {pending ? "Salvando..." : "Salvar e publicar"}
        </Button>
        <Button type="submit" name="status" value="draft" variant="secondary" disabled={pending}>
          Salvar como rascunho
        </Button>
      </div>
    </form>
  );
}

