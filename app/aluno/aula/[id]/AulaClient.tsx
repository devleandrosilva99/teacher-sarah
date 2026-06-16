"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, CircleCheck, Circle } from "lucide-react";
import Card from "@/components/Card";
import { Lesson, getStudentLessons } from "@/lib/mock-data";
import { getSession } from "@/lib/auth";

export default function AulaClient({ id }: { id: string }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      setLoaded(true);
      return;
    }
    const lessons = getStudentLessons(s.userId);
    const found = lessons.find((l) => l.id === Number(id)) ?? null;
    setLesson(found);
    setLoaded(true);
  }, [id]);

  if (!loaded) {
    return (
      <div style={{ paddingTop: "2rem", textAlign: "center", color: "#9A9A9A", fontSize: 14 }}>
        Carregando…
      </div>
    );
  }

  if (!lesson) {
    return (
      <div
        style={{
          paddingTop: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <p style={{ fontSize: 14, color: "#6B6B6B", margin: 0 }}>Aula não encontrada.</p>
        <Link
          href="/aluno"
          style={{ fontSize: 13, color: "#0C447C", textDecoration: "none", fontWeight: 500 }}
        >
          ← Voltar para suas aulas
        </Link>
      </div>
    );
  }

  const visibleVocab = lesson.vocabulary.slice(0, 7);
  const extraVocab = lesson.vocabulary.length - 7;

  return (
    <div
      style={{
        paddingTop: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <Link
        href="/aluno"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          color: "#6B6B6B",
          textDecoration: "none",
          marginBottom: 4,
        }}
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>

      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 12, color: "#9A9A9A", marginBottom: 4 }}>
          Aula {lesson.id} · {lesson.date} · {lesson.duration}
        </div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "#1A1A1A",
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {lesson.title}
        </h2>
      </div>

      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <MessageCircle size={16} color="#378ADD" />
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#6B6B6B",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Recado da Teacher Sarah
          </span>
        </div>
        <p
          style={{
            fontSize: 14,
            color: "#1A1A1A",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {lesson.teacherComment}
        </p>
      </Card>

      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "#9A9A9A",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginTop: 6,
        }}
      >
        Resumo da aula
      </div>
      <Card>
        {lesson.summary.map((para, i) => (
          <p
            key={i}
            style={{
              fontSize: 14,
              color: "#1A1A1A",
              lineHeight: 1.6,
              margin: 0,
              marginTop: i > 0 ? 10 : 0,
            }}
          >
            {i === lesson.summary.length - 1 ? <em>{para}</em> : para}
          </p>
        ))}
      </Card>

      {lesson.vocabulary.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#9A9A9A",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 6,
            }}
          >
            Vocabulário novo · {lesson.vocabulary.length} palavras
          </div>
          <Card>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {visibleVocab.map(({ word }) => (
                <span
                  key={word}
                  style={{
                    backgroundColor: "#EEEDFE",
                    color: "#3C3489",
                    fontSize: 13,
                    fontWeight: 500,
                    padding: "4px 12px",
                    borderRadius: 8,
                  }}
                >
                  {word}
                </span>
              ))}
              {extraVocab > 0 && (
                <span
                  style={{
                    backgroundColor: "#EFEDE5",
                    color: "#6B6B6B",
                    fontSize: 13,
                    fontWeight: 500,
                    padding: "4px 12px",
                    borderRadius: 8,
                  }}
                >
                  +{extraVocab}
                </span>
              )}
            </div>
          </Card>
        </>
      )}

      {lesson.exercises.length > 0 && (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#9A9A9A",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 6,
            }}
          >
            Exercícios · {lesson.exercisesDone} de {lesson.exercisesTotal}
          </div>
          <Card style={{ padding: 0 }}>
            {lesson.exercises.map((ex, idx) => (
              <div
                key={ex.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "0.875rem 1.25rem",
                  borderBottom:
                    idx < lesson.exercises.length - 1
                      ? "0.5px solid rgba(0,0,0,0.08)"
                      : "none",
                }}
              >
                {ex.status === "completed" ? (
                  <CircleCheck size={20} color="#1D9E75" strokeWidth={1.5} />
                ) : (
                  <Circle size={20} color="#9A9A9A" strokeWidth={1.5} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>{ex.type}</div>
                  {ex.status === "completed" && ex.score != null ? (
                    <div style={{ fontSize: 12, color: "#6B6B6B", marginTop: 1 }}>
                      {ex.score} / {ex.total} acertos
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "#9A9A9A", marginTop: 1 }}>
                      {ex.total} {ex.total === 1 ? "questão" : "questões"}
                    </div>
                  )}
                </div>
                {ex.status === "not-started" && (
                  <button
                    aria-label={`Iniciar ${ex.type}`}
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#0C447C",
                      backgroundColor: "#E6F1FB",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 14px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Iniciar
                  </button>
                )}
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
