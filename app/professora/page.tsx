"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import Card from "@/components/Card";
import MetricCard from "@/components/MetricCard";
import StudentRow from "@/components/StudentRow";
import NewLessonModal, { ScheduledLesson } from "@/components/NewLessonModal";
import ScheduledLessons from "@/components/ScheduledLessons";
import { students } from "@/lib/mock-data";

export default function ProfessoraPage() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduledLessons, setScheduledLessons] = useState<ScheduledLesson[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("scheduled_lessons");
    if (stored) setScheduledLessons(JSON.parse(stored));
  }, []);

  function handleSaved(lesson: ScheduledLesson) {
    setScheduledLessons((prev) => [...prev, lesson]);
  }

  const filtered = students.filter((s) => {
    const matchName = s.name.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === "all" || s.level === levelFilter;
    return matchName && matchLevel;
  });

  return (
    <>
      <div
        style={{
          paddingTop: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 500, color: "#1A1A1A", margin: 0 }}>
              Meus alunos
            </h2>
            <p style={{ fontSize: 13, color: "#6B6B6B", margin: "3px 0 0" }}>
              23 alunos ativos
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            aria-label="Agendar nova aula"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "#FFFFFF",
              backgroundColor: "#1A1A1A",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            <Plus size={15} />
            Nova aula
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          <MetricCard label="Aulas esta semana" value="14" />
          <MetricCard label="Homeworks pendentes" value="8" valueColor="#BA7517" />
          <MetricCard label="Alunos inativos" value="3" valueColor="#A32D2D" />
        </div>

        <ScheduledLessons
          lessons={scheduledLessons}
          onChange={setScheduledLessons}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            type="text"
            placeholder="Buscar aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              fontSize: 14,
              color: "#1A1A1A",
              backgroundColor: "#FFFFFF",
              border: "0.5px solid rgba(0,0,0,0.08)",
              borderRadius: 8,
              padding: "9px 12px",
              outline: "none",
            }}
            aria-label="Buscar aluno"
          />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{
              width: 130,
              fontSize: 14,
              color: "#1A1A1A",
              backgroundColor: "#FFFFFF",
              border: "0.5px solid rgba(0,0,0,0.08)",
              borderRadius: 8,
              padding: "9px 10px",
              outline: "none",
              cursor: "pointer",
            }}
            aria-label="Filtrar por nível"
          >
            <option value="all">Todos níveis</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
          </select>
        </div>

        <Card style={{ padding: "0", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "2rem 0",
                textAlign: "center",
                fontSize: 14,
                color: "#9A9A9A",
              }}
            >
              Nenhum aluno encontrado
            </div>
          ) : (
            filtered.map((student, idx) => (
              <StudentRow
                key={student.id}
                id={student.id}
                initials={student.initials}
                name={student.name}
                level={student.level}
                lastLessonDaysAgo={student.lastLessonDaysAgo}
                status={student.status}
                averageScore={student.averageScore}
                lessonsCompleted={student.lessonsCompleted}
                lessonsTotal={student.lessonsTotal}
                avatarColor={student.avatarColor}
                avatarTextColor={student.avatarTextColor}
                isLast={idx === filtered.length - 1}
              />
            ))
          )}
        </Card>
      </div>

      {modalOpen && (
        <NewLessonModal
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
