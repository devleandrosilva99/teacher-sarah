import Card from "@/components/Card";
import MetricCard from "@/components/MetricCard";
import ProgressBar from "@/components/ProgressBar";
import { lucasProgress } from "@/lib/mock-data";

const skillConfig = [
  { key: "grammar", label: "Grammar", color: "#534AB7" },
  { key: "vocabulary", label: "Vocabulary", color: "#1D9E75" },
  { key: "reading", label: "Reading", color: "#378ADD" },
  { key: "listening", label: "Listening", color: "#D85A30" },
] as const;

const PAD_LEFT = 44;
const PAD_RIGHT = 20;
const PAD_TOP = 10;
const PAD_BOTTOM = 28;
const W = 580;
const H = 160;
const CHART_W = W - PAD_LEFT - PAD_RIGHT;
const CHART_H = H - PAD_TOP - PAD_BOTTOM;

function xFor(i: number, total: number) {
  return PAD_LEFT + (i / (total - 1)) * CHART_W;
}
function yFor(v: number) {
  return PAD_TOP + CHART_H - (v / 100) * CHART_H;
}

export default function ProgressoPage() {
  const {
    accuracyRate,
    wordsLearned,
    hoursStudied,
    skills,
    evolution,
    errorNotes,
  } = lucasProgress;

  const points = evolution.map((v, i) => ({
    x: xFor(i, evolution.length),
    y: yFor(v),
    v,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  const y50 = yFor(50);
  const y100 = yFor(100);

  return (
    <div
      style={{
        paddingTop: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "#1A1A1A",
            margin: 0,
          }}
        >
          Seu progresso
        </h2>
        <p style={{ fontSize: 13, color: "#6B6B6B", margin: "4px 0 0" }}>
          Últimos 3 meses
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        <MetricCard label="Taxa de acerto" value={`${accuracyRate}%`} />
        <MetricCard
          label="Palavras aprendidas"
          value={String(wordsLearned)}
        />
        <MetricCard label="Horas estudadas" value={`${hoursStudied}h`} />
      </div>

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
        Desempenho por habilidade
      </div>

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {skillConfig.map(({ key, label, color }) => {
            const value = skills[key];
            return (
              <div key={key}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 13, color: "#1A1A1A" }}>
                    {label}
                  </span>
                  <span
                    style={{ fontSize: 13, fontWeight: 500, color }}
                  >
                    {value}%
                  </span>
                </div>
                <ProgressBar percent={value} color={color} height={6} />
              </div>
            );
          })}
        </div>
      </Card>

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
        Evolução das aulas
      </div>

      <Card style={{ padding: "1rem 0.75rem" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          aria-label="Gráfico de evolução das aulas"
        >
          <line
            x1={PAD_LEFT}
            y1={H - PAD_BOTTOM}
            x2={W - PAD_RIGHT}
            y2={H - PAD_BOTTOM}
            stroke="#EFEDE5"
            strokeWidth={1}
          />
          <line
            x1={PAD_LEFT}
            y1={PAD_TOP}
            x2={PAD_LEFT}
            y2={H - PAD_BOTTOM}
            stroke="#EFEDE5"
            strokeWidth={1}
          />
          <line
            x1={PAD_LEFT}
            y1={y50}
            x2={W - PAD_RIGHT}
            y2={y50}
            stroke="#EFEDE5"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <line
            x1={PAD_LEFT}
            y1={y100}
            x2={W - PAD_RIGHT}
            y2={y100}
            stroke="#EFEDE5"
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          <text
            x={PAD_LEFT - 6}
            y={H - PAD_BOTTOM + 1}
            textAnchor="end"
            fontSize={18}
            fill="#9A9A9A"
          >
            0%
          </text>
          <text
            x={PAD_LEFT - 6}
            y={y50 + 1}
            textAnchor="end"
            fontSize={18}
            fill="#9A9A9A"
          >
            50%
          </text>
          <text
            x={PAD_LEFT - 6}
            y={y100 + 1}
            textAnchor="end"
            fontSize={18}
            fill="#9A9A9A"
          >
            100%
          </text>

          <text
            x={xFor(0, evolution.length)}
            y={H - 6}
            textAnchor="middle"
            fontSize={18}
            fill="#9A9A9A"
          >
            Aula 6
          </text>
          <text
            x={xFor(6, evolution.length)}
            y={H - 6}
            textAnchor="middle"
            fontSize={18}
            fill="#9A9A9A"
          >
            Aula 12
          </text>
          <text
            x={xFor(12, evolution.length)}
            y={H - 6}
            textAnchor="middle"
            fontSize={18}
            fill="#9A9A9A"
          >
            Aula 18
          </text>

          <polyline
            points={polyline}
            fill="none"
            stroke="#1D9E75"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="#1D9E75" />
          ))}
        </svg>
      </Card>

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
        Caderno de erros · 12 itens
      </div>

      <Card style={{ padding: 0 }}>
        {errorNotes.map((note, idx) => (
          <div
            key={idx}
            style={{
              padding: "1rem 1.25rem",
              borderBottom:
                idx < errorNotes.length - 1
                  ? "0.5px solid rgba(0,0,0,0.08)"
                  : "none",
            }}
          >
            <div style={{ fontSize: 13, color: "#6B6B6B", marginBottom: 4 }}>
              {note.wrong.split(note.wrongWord).map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span
                      style={{
                        color: "#A32D2D",
                        textDecoration: "line-through",
                      }}
                    >
                      {note.wrongWord}
                    </span>
                  )}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#6B6B6B" }}>
              {"→ "}
              {note.correct.split(note.correctWord).map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span
                      style={{ color: "#0F6E56", fontWeight: 500 }}
                    >
                      {note.correctWord}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
        <div style={{ padding: "0.75rem 1.25rem" }}>
          <a
            href="#"
            style={{
              fontSize: 13,
              color: "#0C447C",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Ver todos os 12 erros →
          </a>
        </div>
      </Card>
    </div>
  );
}
