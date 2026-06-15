"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Badge from "./Badge";

interface LessonCardProps {
  id: number;
  date: string;
  title: string;
  status: "homework-pending" | "completed";
  exercisesDone: number;
  exercisesTotal: number;
}

const statusConfig = {
  "homework-pending": {
    borderColor: "#BA7517",
    badgeVariant: "warning" as const,
    label: "Hw pendente",
    desc: (done: number, total: number) => `${done} de ${total} exercícios feitos`,
  },
  completed: {
    borderColor: "#1D9E75",
    badgeVariant: "success" as const,
    label: "Concluída",
    desc: (done: number, total: number) => `${done} de ${total} exercícios feitos`,
  },
};

export default function LessonCard({
  id,
  date,
  title,
  status,
  exercisesDone,
  exercisesTotal,
}: LessonCardProps) {
  const config = statusConfig[status];

  return (
    <Link href={`/aluno/aula/${id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "0.5px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          borderLeft: `3px solid ${config.borderColor}`,
          padding: "0.875rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "0.8")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "1")}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: "#6B6B6B",
              marginBottom: 2,
            }}
          >
            {date}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#1A1A1A",
              marginBottom: 6,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge variant={config.badgeVariant}>{config.label}</Badge>
            <span style={{ fontSize: 12, color: "#9A9A9A" }}>
              {config.desc(exercisesDone, exercisesTotal)}
            </span>
          </div>
        </div>
        <ChevronRight size={16} color="#9A9A9A" />
      </div>
    </Link>
  );
}
