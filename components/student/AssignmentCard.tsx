import Link from "next/link";
import type { StudentAssignmentRow } from "@/server/services/assignments";
import type { Assignment, AssignmentSummary, Submission, SubmissionSummary } from "@/lib/types";
import { ASSIGNMENT_STATUS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { Badge, scoreVariant } from "@/components/ui";

export default function AssignmentCard({ row }: { row: StudentAssignmentRow<AssignmentSummary | Assignment, SubmissionSummary | Submission> }) {
  const a = row.assignment;
  const st = ASSIGNMENT_STATUS[row.status];
  return (
    <Link href={`/aluno/atividades/${a.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 hover:border-brand">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{a.title}</div>
        <div className="text-xs text-ink-3">
          {"questionCount" in a ? a.questionCount : a.questions.length} questões
          {a.dueAt && ` · prazo ${formatDateTime(a.dueAt)}`}
          {a.timeLimitMin > 0 && ` · ${a.timeLimitMin} min`}
        </div>
      </div>
      {row.percent !== null ? <Badge variant={scoreVariant(row.percent)}>{row.percent}%</Badge> : <Badge variant={st.variant}>{st.label}</Badge>}
    </Link>
  );
}
