import { describeKey, type Keys } from "@/lib/question-types";
import type { AnswerRecord, Passage, SnapshotQuestion } from "@/lib/types";
import QuestionPlayer, { Media } from "./QuestionPlayer";
import { Badge } from "@/components/ui";

/** Uma questão já respondida: resposta do aluno, acertos e (opcionalmente) gabarito. */
export default function AnswerReview({
  index,
  question,
  answer,
  showKey,
  passage,
  children,
}: {
  index: number;
  question: SnapshotQuestion;
  answer: AnswerRecord | undefined;
  showKey: boolean;
  passage?: Passage;
  children?: React.ReactNode;
}) {
  const response = (answer?.response ?? {}) as Record<string, unknown>;
  const correctIds =
    showKey && question.type === "single_choice"
      ? [(question.answerKey as Keys["single_choice"]).correct]
      : showKey && question.type === "multiple_choice"
        ? (question.answerKey as Keys["multiple_choice"]).correct
        : undefined;
  const pending = answer?.score === null;
  const variant = pending ? "purple" : answer?.correct ? "success" : (answer?.score ?? 0) > 0 ? "warning" : "danger";

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-2 flex items-start gap-2">
        <span className="mt-0.5 text-sm font-medium text-ink-3">{index}.</span>
        <div className="min-w-0 flex-1">
          {passage && <div className="mb-1 text-xs text-ink-3">Leitura: {passage.title}</div>}
          <p className="whitespace-pre-wrap text-sm font-medium">{question.prompt}</p>
          {question.instructions && <p className="text-xs text-ink-2">{question.instructions}</p>}
        </div>
        <Badge variant={variant}>
          {pending ? "Aguardando correção" : `${answer?.score ?? 0}/${question.activityPoints}`}
        </Badge>
      </div>
      <Media url={question.mediaUrl} />
      <QuestionPlayer
        question={{ id: question.id, type: question.type, prompt: question.prompt, instructions: question.instructions, mediaUrl: question.mediaUrl, passageId: question.passageId, points: question.activityPoints, content: question.content }}
        value={response}
        readOnly
        detail={showKey ? answer?.detail : undefined}
        correctIds={correctIds}
      />
      {showKey && question.type !== "single_choice" && question.type !== "multiple_choice" && (
        <p className="mt-3 rounded-lg bg-success-bg px-3 py-2 text-xs text-success-fg">
          <span className="font-medium">{question.type === "open" ? "Resposta-modelo: " : "Resposta esperada: "}</span>
          {describeKey(question.type, question.content, question.answerKey)}
        </p>
      )}
      {showKey && question.explanation && <p className="mt-2 text-xs text-ink-2"><span className="font-medium">Explicação:</span> {question.explanation}</p>}
      {answer?.feedback && !children && (
        <p className="mt-2 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-ink">
          <span className="text-xs font-medium">Comentário do professor: </span>
          {answer.feedback}
        </p>
      )}
      {children}
    </div>
  );
}
