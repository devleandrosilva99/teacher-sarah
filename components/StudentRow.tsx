"use client";

import Link from "next/link";
import { useState } from "react";
import Avatar from "./Avatar";
import Badge from "./Badge";

interface StudentRowProps {
  id: string;
  initials: string;
  name: string;
  level: string;
  lastLessonDaysAgo: number;
  status: "on-track" | "homework-pending" | "inactive";
  averageScore: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  avatarColor: string;
  avatarTextColor: string;
  isLast?: boolean;
}

const statusConfig = {
  "on-track": { variant: "success" as const, label: "Em dia" },
  "homework-pending": { variant: "warning" as const, label: "Hw pendente" },
  inactive: { variant: "danger" as const, label: "Inativo" },
};

function barColor(status: StudentRowProps["status"]): string {
  if (status === "inactive") return "#D85A30";
  if (status === "homework-pending") return "#BA7517";
  return "#1D9E75";
}

function barBgColor(status: StudentRowProps["status"]): string {
  if (status === "inactive") return "#FAECE7";
  if (status === "homework-pending") return "#FAEEDA";
  return "#E1F5EE";
}

export default function StudentRow({
  id,
  initials,
  name,
  level,
  lastLessonDaysAgo,
  status,
  lessonsCompleted,
  lessonsTotal,
  avatarColor,
  avatarTextColor,
  isLast = false,
}: StudentRowProps) {
  const [hovered, setHovered] = useState(false);
  const sc = statusConfig[status];
  const percent = Math.round((lessonsCompleted / lessonsTotal) * 100);

  return (
    <Link
      href={`/professora/aluno/${id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: isLast ? "none" : "0.5px solid rgba(0,0,0,0.08)",
          backgroundColor: hovered ? "#FAFAF8" : "transparent",
          margin: "0 -1.25rem",
          padding: "0.875rem 1.25rem",
          transition: "background-color 0.12s",
          cursor: "pointer",
        }}
      >
        <Avatar
          initials={initials}
          bgColor={avatarColor}
          textColor={avatarTextColor}
          size={36}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 5,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>
              {name}
            </span>
            <Badge variant={sc.variant}>{sc.label}</Badge>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 5,
                backgroundColor: barBgColor(status),
                borderRadius: 5,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${percent}%`,
                  height: "100%",
                  backgroundColor: barColor(status),
                  borderRadius: 5,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: barColor(status),
                whiteSpace: "nowrap",
              }}
            >
              {lessonsCompleted}/{lessonsTotal} aulas
            </span>
          </div>

          <div style={{ fontSize: 12, color: "#9A9A9A" }}>
            {level} · Última aula há {lastLessonDaysAgo}{" "}
            {lastLessonDaysAgo === 1 ? "dia" : "dias"}
          </div>
        </div>
      </div>
    </Link>
  );
}
