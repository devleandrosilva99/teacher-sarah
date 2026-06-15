"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import {
  Student,
  StudentProfile,
  LEVEL_LABELS,
  AVATAR_PALETTE,
  loadAddedStudents,
  saveAddedStudent,
} from "@/lib/mock-data";

interface NewStudentModalProps {
  onClose: () => void;
  onSaved: (student: Student) => void;
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

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

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "#6B6B6B",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginTop: 4,
  marginBottom: -4,
};

const errorTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#A32D2D",
  marginTop: 3,
  display: "block",
};

function formatCPF(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function isValidCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10]);
}

function formatCEP(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function NewStudentModal({ onClose, onSaved }: NewStudentModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [nationality, setNationality] = useState("Brasileira");
  const [occupation, setOccupation] = useState("");

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [level, setLevel] = useState<(typeof LEVELS)[number]>("A1");
  const [lessonsTotal, setLessonsTotal] = useState("30");
  const [classSchedule, setClassSchedule] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [teacherNotes, setTeacherNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  function clearError(field: string) {
    setErrors((p) => {
      if (!p[field]) return p;
      const next = { ...p };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Informe o nome completo";
    if (!email.trim()) e.email = "Informe o e-mail";
    else if (!isValidEmail(email)) e.email = "E-mail inválido";
    if (!phone.trim()) e.phone = "Informe o telefone";
    if (!cpf.trim()) e.cpf = "Informe o CPF";
    else if (!isValidCPF(cpf)) e.cpf = "CPF inválido";
    const total = parseInt(lessonsTotal, 10);
    if (!total || total < 1) e.lessonsTotal = "Informe um número válido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    const added = loadAddedStudents();
    const palette = AVATAR_PALETTE[added.length % AVATAR_PALETTE.length];
    const trimmedName = name.trim();

    const profile: StudentProfile = {
      email: email.trim(),
      phone: phone.trim(),
      birthDate,
      nationality: nationality.trim(),
      occupation: occupation.trim(),
      cpf: cpf.trim(),
      cep: cep.trim(),
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      learningGoal: learningGoal.trim(),
      classSchedule: classSchedule.trim(),
      teacherNotes: teacherNotes.trim(),
    };

    const student: Student = {
      id: `s_${Date.now()}`,
      initials: makeInitials(trimmedName),
      name: trimmedName,
      level,
      levelLabel: LEVEL_LABELS[level],
      avatarColor: palette.bg,
      avatarTextColor: palette.fg,
      lastLessonDaysAgo: 0,
      status: "on-track",
      averageScore: 0,
      lessonsCompleted: 0,
      lessonsTotal: parseInt(lessonsTotal, 10),
      profile,
    };

    saveAddedStudent(student);
    setDone(true);
    setTimeout(() => {
      onSaved(student);
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
          maxHeight: "92vh",
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
          <div>
            <span style={{ fontSize: 16, fontWeight: 500, color: "#1A1A1A" }}>
              Cadastrar novo aluno
            </span>
            <div style={{ fontSize: 12, color: "#9A9A9A", marginTop: 2 }}>
              Campos com * são obrigatórios
            </div>
          </div>
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
        <div
          style={{
            overflowY: "auto",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {done ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "3rem 0",
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
                Aluno cadastrado!
              </p>
            </div>
          ) : (
            <>
              {/* Identificação */}
              <div style={sectionLabelStyle}>Identificação</div>

              <div>
                <label htmlFor="ns-name" style={labelStyle}>Nome completo *</label>
                <input
                  id="ns-name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearError("name"); }}
                  style={{ ...inputStyle, borderColor: borderColor("name") }}
                />
                {errors.name && <span style={errorTextStyle}>{errors.name}</span>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label htmlFor="ns-cpf" style={labelStyle}>CPF *</label>
                  <input
                    id="ns-cpf"
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => { setCpf(formatCPF(e.target.value)); clearError("cpf"); }}
                    style={{ ...inputStyle, borderColor: borderColor("cpf") }}
                  />
                  {errors.cpf && <span style={errorTextStyle}>{errors.cpf}</span>}
                </div>
                <div>
                  <label htmlFor="ns-birth" style={labelStyle}>Data de nascimento</label>
                  <input
                    id="ns-birth"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ns-nationality" style={labelStyle}>Nacionalidade</label>
                <input
                  id="ns-nationality"
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="ns-occupation" style={labelStyle}>Profissão / ocupação</label>
                <input
                  id="ns-occupation"
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Contato */}
              <div style={sectionLabelStyle}>Contato</div>

              <div>
                <label htmlFor="ns-email" style={labelStyle}>E-mail *</label>
                <input
                  id="ns-email"
                  type="email"
                  placeholder="aluno@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                  style={{ ...inputStyle, borderColor: borderColor("email") }}
                />
                {errors.email && <span style={errorTextStyle}>{errors.email}</span>}
              </div>

              <div>
                <label htmlFor="ns-phone" style={labelStyle}>Telefone / WhatsApp *</label>
                <input
                  id="ns-phone"
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={phone}
                  onChange={(e) => { setPhone(formatPhone(e.target.value)); clearError("phone"); }}
                  style={{ ...inputStyle, borderColor: borderColor("phone") }}
                />
                {errors.phone && <span style={errorTextStyle}>{errors.phone}</span>}
              </div>

              {/* Endereço */}
              <div style={sectionLabelStyle}>Endereço</div>

              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
                <div>
                  <label htmlFor="ns-cep" style={labelStyle}>CEP</label>
                  <input
                    id="ns-cep"
                    type="text"
                    inputMode="numeric"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(formatCEP(e.target.value))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="ns-street" style={labelStyle}>Rua / logradouro</label>
                  <input
                    id="ns-street"
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 12 }}>
                <div>
                  <label htmlFor="ns-number" style={labelStyle}>Número</label>
                  <input
                    id="ns-number"
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="ns-complement" style={labelStyle}>Complemento</label>
                  <input
                    id="ns-complement"
                    type="text"
                    placeholder="Apto, bloco, etc."
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ns-neighborhood" style={labelStyle}>Bairro</label>
                <input
                  id="ns-neighborhood"
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 12 }}>
                <div>
                  <label htmlFor="ns-city" style={labelStyle}>Cidade</label>
                  <input
                    id="ns-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="ns-state" style={labelStyle}>UF</label>
                  <input
                    id="ns-state"
                    type="text"
                    maxLength={2}
                    placeholder="SP"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Aulas */}
              <div style={sectionLabelStyle}>Aulas e objetivos</div>

              <div>
                <label style={labelStyle}>Nível</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 8,
                        border: level === l ? "none" : "0.5px solid rgba(0,0,0,0.12)",
                        backgroundColor: level === l ? "#1A1A1A" : "#F5F4EF",
                        color: level === l ? "#FFFFFF" : "#6B6B6B",
                        fontSize: 13,
                        fontWeight: level === l ? 500 : 400,
                        cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#9A9A9A", marginTop: 4 }}>
                  {LEVEL_LABELS[level]}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
                <div>
                  <label htmlFor="ns-total" style={labelStyle}>Aulas no pacote *</label>
                  <input
                    id="ns-total"
                    type="number"
                    min={1}
                    value={lessonsTotal}
                    onChange={(e) => { setLessonsTotal(e.target.value); clearError("lessonsTotal"); }}
                    style={{ ...inputStyle, borderColor: borderColor("lessonsTotal") }}
                  />
                  {errors.lessonsTotal && <span style={errorTextStyle}>{errors.lessonsTotal}</span>}
                </div>
                <div>
                  <label htmlFor="ns-schedule" style={labelStyle}>Horário preferido</label>
                  <input
                    id="ns-schedule"
                    type="text"
                    placeholder="Ex: Terças e quintas, 19h"
                    value={classSchedule}
                    onChange={(e) => setClassSchedule(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ns-goal" style={labelStyle}>Objetivo de aprendizado</label>
                <textarea
                  id="ns-goal"
                  rows={2}
                  placeholder="O que o aluno quer alcançar com as aulas?"
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                />
              </div>

              {/* Observações */}
              <div style={sectionLabelStyle}>Observações</div>

              <div>
                <label htmlFor="ns-notes" style={labelStyle}>Notas internas (opcional)</label>
                <textarea
                  id="ns-notes"
                  rows={3}
                  placeholder="Observações da professora, visíveis só para você."
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
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
              type="button"
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
              type="button"
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
              Cadastrar aluno
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
