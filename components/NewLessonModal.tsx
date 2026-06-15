"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { students, Student, loadAddedStudents } from "@/lib/mock-data";

export interface ScheduledLesson {
  id: string;
  studentId: string;
  studentName: string;
  studentInitials: string;
  studentAvatarColor: string;
  studentAvatarTextColor: string;
  date: string;
  time: string;
  duration: string;
  title: string;
  notes: string;
  createdAt: string;
}

interface NewLessonModalProps {
  onClose: () => void;
  onSaved: (lesson: ScheduledLesson) => void;
}

const DURATIONS = ["30min", "45min", "60min", "90min"];

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "#9A9A9A",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 4,
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 14,
  color: "#1A1A1A",
  backgroundColor: "#F5F4EF",
  border: "0.5px solid rgba(0,0,0,0.12)",
  borderRadius: 8,
  padding: "9px 11px",
  outline: "none",
  fontFamily: "inherit",
};

export default function NewLessonModal({ onClose, onSaved }: NewLessonModalProps) {
  const [allStudents, setAllStudents] = useState<Student[]>(students);
  const [studentId, setStudentId] = useState(students[0].id);
  const [date, setDate] = useState("");

  useEffect(() => {
    const added = loadAddedStudents();
    if (added.length > 0) setAllStudents([...students, ...added]);
  }, []);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60min");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  function validate() {
    const e: Record<string, boolean> = {};
    if (!date) e.date = true;
    if (!time) e.time = true;
    if (!title.trim()) e.title = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    const student = allStudents.find((s) => s.id === studentId)!;
    const lesson: ScheduledLesson = {
      id: `${Date.now()}`,
      studentId,
      studentName: student.name,
      studentInitials: student.initials,
      studentAvatarColor: student.avatarColor,
      studentAvatarTextColor: student.avatarTextColor,
      date,
      time,
      duration,
      title: title.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    const stored = localStorage.getItem("scheduled_lessons");
    const existing: ScheduledLesson[] = stored ? JSON.parse(stored) : [];
    localStorage.setItem("scheduled_lessons", JSON.stringify([...existing, lesson]));

    setDone(true);
    setTimeout(() => {
      onSaved(lesson);
      onClose();
    }, 1200);
  }

  function borderColor(field: string) {
    return errors[field] ? "#A32D2D" : "rgba(0,0,0,0.12)";
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.3)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 0 env(safe-area-inset-bottom)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 540,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.22s ease",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.1rem 1.25rem 0.9rem",
            borderBottom: "0.5px solid rgba(0,0,0,0.08)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500, color: "#1A1A1A" }}>
            Agendar nova aula
          </span>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9A9A9A",
              padding: 4,
              borderRadius: 6,
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* body */}
        <div style={{ overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: 16 }}>
          {done ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "2.5rem 0",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  backgroundColor: "#E1F5EE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={22} color="#1D9E75" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A", margin: 0 }}>
                Aula agendada!
              </p>
            </div>
          ) : (
            <>
              {/* aluno */}
              <div>
                <label htmlFor="nl-student" style={labelStyle}>Aluno</label>
                <select
                  id="nl-student"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {allStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.level}</option>
                  ))}
                </select>
              </div>

              {/* data + hora */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label htmlFor="nl-date" style={labelStyle}>Data</label>
                  <input
                    id="nl-date"
                    type="date"
                    value={date}
                    onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: false })); }}
                    style={{ ...inputStyle, borderColor: borderColor("date") }}
                  />
                  {errors.date && (
                    <span style={{ fontSize: 11, color: "#A32D2D", marginTop: 3, display: "block" }}>
                      Informe a data
                    </span>
                  )}
                </div>
                <div>
                  <label htmlFor="nl-time" style={labelStyle}>Horário</label>
                  <input
                    id="nl-time"
                    type="time"
                    value={time}
                    onChange={(e) => { setTime(e.target.value); setErrors((p) => ({ ...p, time: false })); }}
                    style={{ ...inputStyle, borderColor: borderColor("time") }}
                  />
                  {errors.time && (
                    <span style={{ fontSize: 11, color: "#A32D2D", marginTop: 3, display: "block" }}>
                      Informe o horário
                    </span>
                  )}
                </div>
              </div>

              {/* duração */}
              <div>
                <label style={labelStyle}>Duração</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 8,
                        border: duration === d ? "none" : "0.5px solid rgba(0,0,0,0.12)",
                        backgroundColor: duration === d ? "#1A1A1A" : "#F5F4EF",
                        color: duration === d ? "#FFFFFF" : "#6B6B6B",
                        fontSize: 13,
                        fontWeight: duration === d ? 500 : 400,
                        cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* tema */}
              <div>
                <label htmlFor="nl-title" style={labelStyle}>Tema / título da aula</label>
                <input
                  id="nl-title"
                  type="text"
                  placeholder="Ex: Present Perfect vs Simple Past"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: false })); }}
                  style={{ ...inputStyle, borderColor: borderColor("title") }}
                />
                {errors.title && (
                  <span style={{ fontSize: 11, color: "#A32D2D", marginTop: 3, display: "block" }}>
                    Informe o tema da aula
                  </span>
                )}
              </div>

              {/* observações */}
              <div>
                <label htmlFor="nl-notes" style={labelStyle}>Observações (opcional)</label>
                <textarea
                  id="nl-notes"
                  placeholder="Pontos a revisar, material necessário…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                />
              </div>
            </>
          )}
        </div>

        {/* footer */}
        {!done && (
          <div
            style={{
              padding: "0.875rem 1.25rem",
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              display: "flex",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 8,
                border: "0.5px solid rgba(0,0,0,0.08)",
                backgroundColor: "#F5F4EF",
                color: "#6B6B6B",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              style={{
                flex: 2,
                padding: "11px 0",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#1A1A1A",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Agendar aula
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
