"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import Avatar from "./Avatar";
import { ScheduledLesson } from "./NewLessonModal";

interface ScheduledLessonsProps {
  lessons: ScheduledLesson[];
  onChange: (lessons: ScheduledLesson[]) => void;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`;
}

export default function ScheduledLessons({ lessons, onChange }: ScheduledLessonsProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const sorted = [...lessons].sort(
    (a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
  );

  function remove(id: string) {
    const updated = lessons.filter((l) => l.id !== id);
    localStorage.setItem("scheduled_lessons", JSON.stringify(updated));
    onChange(updated);
    setConfirmId(null);
  }

  if (sorted.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "#9A9A9A",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginTop: 8,
        }}
      >
        Próximas aulas · {sorted.length}
      </div>

      {sorted.map((lesson) => (
        <div
          key={lesson.id}
          style={{
            backgroundColor: "#FFFFFF",
            border: "0.5px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            padding: "0.875rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* date badge */}
          <div
            style={{
              flexShrink: 0,
              width: 44,
              textAlign: "center",
              backgroundColor: "#EFEDE5",
              borderRadius: 8,
              padding: "6px 0",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 500, color: "#1A1A1A", lineHeight: 1.1 }}>
              {lesson.date.split("-")[2]}
            </div>
            <div style={{ fontSize: 10, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][parseInt(lesson.date.split("-")[1]) - 1]}
            </div>
          </div>

          {/* content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {lesson.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar
                initials={lesson.studentInitials}
                bgColor={lesson.studentAvatarColor}
                textColor={lesson.studentAvatarTextColor}
                size={18}
              />
              <span style={{ fontSize: 12, color: "#6B6B6B" }}>
                {lesson.studentName}
              </span>
              <span style={{ fontSize: 12, color: "#9A9A9A" }}>·</span>
              <span style={{ fontSize: 12, color: "#9A9A9A" }}>
                {lesson.time} · {lesson.duration}
              </span>
            </div>
            {lesson.notes && (
              <div
                style={{
                  fontSize: 12,
                  color: "#9A9A9A",
                  marginTop: 4,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {lesson.notes}
              </div>
            )}
          </div>

          {/* delete */}
          {confirmId === lesson.id ? (
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => setConfirmId(null)}
                style={{
                  fontSize: 12,
                  color: "#6B6B6B",
                  backgroundColor: "#EFEDE5",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 10px",
                  cursor: "pointer",
                }}
              >
                Não
              </button>
              <button
                onClick={() => remove(lesson.id)}
                style={{
                  fontSize: 12,
                  color: "#A32D2D",
                  backgroundColor: "#FCEBEB",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 10px",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Remover
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmId(lesson.id)}
              aria-label="Remover aula"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9A9A9A",
                padding: 6,
                borderRadius: 6,
                display: "flex",
                flexShrink: 0,
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
