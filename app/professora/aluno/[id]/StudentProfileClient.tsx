"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Check, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import { Student, StudentProfile } from "@/lib/mock-data";

const statusConfig = {
  "on-track": { variant: "success" as const, label: "Em dia" },
  "homework-pending": { variant: "warning" as const, label: "Hw pendente" },
  inactive: { variant: "danger" as const, label: "Inativo" },
};

function barColor(status: Student["status"]): string {
  if (status === "inactive") return "#D85A30";
  if (status === "homework-pending") return "#BA7517";
  return "#1D9E75";
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function age(iso: string): number {
  const birth = new Date(iso);
  const today = new Date();
  let a = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
  return a;
}

interface FieldProps {
  label: string;
  value: string;
  editing: boolean;
  multiline?: boolean;
  onChange: (v: string) => void;
  type?: string;
}

function Field({ label, value, editing, multiline, onChange, type = "text" }: FieldProps) {
  const displayValue =
    type === "date" && value && !editing ? `${formatDate(value)} (${age(value)} anos)` : value;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "#9A9A9A",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      {editing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            style={{
              fontSize: 14,
              color: "#1A1A1A",
              backgroundColor: "#F5F4EF",
              border: "0.5px solid rgba(0,0,0,0.15)",
              borderRadius: 8,
              padding: "8px 10px",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
              width: "100%",
            }}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              fontSize: 14,
              color: "#1A1A1A",
              backgroundColor: "#F5F4EF",
              border: "0.5px solid rgba(0,0,0,0.15)",
              borderRadius: 8,
              padding: "8px 10px",
              outline: "none",
              fontFamily: "inherit",
              width: "100%",
            }}
          />
        )
      ) : (
        <span
          style={{
            fontSize: 14,
            color: value ? "#1A1A1A" : "#9A9A9A",
            lineHeight: 1.5,
          }}
        >
          {displayValue || "—"}
        </span>
      )}
    </div>
  );
}

export default function StudentProfileClient({ student }: { student: Student }) {
  const STORAGE_KEY = `student_profile_${student.id}`;

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<StudentProfile>(student.profile);
  const [draft, setDraft] = useState<StudentProfile>(student.profile);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StudentProfile;
      setProfile(parsed);
      setDraft(parsed);
    }
  }, [STORAGE_KEY]);

  function startEdit() {
    setDraft(profile);
    setEditing(true);
    setSaved(false);
  }

  function cancelEdit() {
    setDraft(profile);
    setEditing(false);
  }

  function saveEdit() {
    setProfile(draft);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function set(field: keyof StudentProfile) {
    return (value: string) => setDraft((d) => ({ ...d, [field]: value }));
  }

  const data = editing ? draft : profile;
  const sc = statusConfig[student.status];
  const percent = Math.round((student.lessonsCompleted / student.lessonsTotal) * 100);
  const color = barColor(student.status);

  return (
    <div style={{ paddingTop: "1.25rem", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link
          href="/professora"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            color: "#6B6B6B",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} />
          Meus alunos
        </Link>

        {!editing ? (
          <button
            onClick={startEdit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "#1A1A1A",
              backgroundColor: "#FFFFFF",
              border: "0.5px solid rgba(0,0,0,0.08)",
              borderRadius: 8,
              padding: "7px 12px",
              cursor: "pointer",
            }}
          >
            <Pencil size={14} />
            Editar ficha
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={cancelEdit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                fontWeight: 500,
                color: "#6B6B6B",
                backgroundColor: "#FFFFFF",
                border: "0.5px solid rgba(0,0,0,0.08)",
                borderRadius: 8,
                padding: "7px 12px",
                cursor: "pointer",
              }}
            >
              <X size={14} />
              Cancelar
            </button>
            <button
              onClick={saveEdit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                fontWeight: 500,
                color: "#0F6E56",
                backgroundColor: "#E1F5EE",
                border: "none",
                borderRadius: 8,
                padding: "7px 14px",
                cursor: "pointer",
              }}
            >
              <Check size={14} />
              Salvar
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div
          style={{
            backgroundColor: "#E1F5EE",
            border: "0.5px solid #1D9E75",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "#0F6E56",
            fontWeight: 500,
          }}
        >
          Ficha salva com sucesso.
        </div>
      )}

      {/* Hero */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar
            initials={student.initials}
            bgColor={student.avatarColor}
            textColor={student.avatarTextColor}
            size={56}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 16, fontWeight: 500, color: "#1A1A1A" }}>
                {student.name}
              </span>
              <Badge variant={sc.variant}>{sc.label}</Badge>
            </div>
            <div style={{ fontSize: 13, color: "#6B6B6B", marginTop: 2 }}>
              Nível {student.level} · {student.levelLabel}
            </div>

            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <span style={{ fontSize: 12, color: "#6B6B6B" }}>Progresso do nível</span>
                <span style={{ fontSize: 12, fontWeight: 500, color }}>
                  {student.lessonsCompleted}/{student.lessonsTotal} aulas · {percent}%
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  backgroundColor: "#EFEDE5",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    backgroundColor: color,
                    borderRadius: 6,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Informações pessoais */}
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
        Informações pessoais
      </div>
      <Card>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px 20px",
          }}
        >
          <Field label="E-mail" value={data.email} editing={editing} onChange={set("email")} type="email" />
          <Field label="Telefone / WhatsApp" value={data.phone} editing={editing} onChange={set("phone")} type="tel" />
          <Field label="Data de nascimento" value={data.birthDate} editing={editing} onChange={set("birthDate")} type="date" />
          <Field label="Nacionalidade" value={data.nationality} editing={editing} onChange={set("nationality")} />
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Profissão / ocupação" value={data.occupation} editing={editing} onChange={set("occupation")} />
          </div>
        </div>
      </Card>

      {/* Aulas */}
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
        Aulas e objetivos
      </div>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field
            label="Horário preferido"
            value={data.classSchedule}
            editing={editing}
            onChange={set("classSchedule")}
          />
          <Field
            label="Objetivo de aprendizado"
            value={data.learningGoal}
            editing={editing}
            multiline
            onChange={set("learningGoal")}
          />
        </div>
      </Card>

      {/* Observações da professora */}
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
        Observações da professora
      </div>
      <Card>
        <Field
          label="Notas internas"
          value={data.teacherNotes}
          editing={editing}
          multiline
          onChange={set("teacherNotes")}
        />
      </Card>
    </div>
  );
}
