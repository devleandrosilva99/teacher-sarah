export type AssignmentStatusKey = "not_started" | "in_progress" | "submitted" | "graded" | "overdue";

export const ASSIGNMENT_STATUS: Record<AssignmentStatusKey, { label: string; variant: "neutral" | "info" | "purple" | "success" | "danger" }> = {
  not_started: { label: "Não iniciada", variant: "neutral" },
  in_progress: { label: "Em andamento", variant: "info" },
  submitted: { label: "Aguardando correção", variant: "purple" },
  graded: { label: "Corrigida", variant: "success" },
  overdue: { label: "Atrasada", variant: "danger" },
};

export const SHOW_ANSWERS_LABELS = {
  after_submit: "Logo após a entrega",
  after_due: "Depois do prazo",
  never: "Nunca",
} as const;
