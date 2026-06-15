import Card from "@/components/Card";
import LessonCard from "@/components/LessonCard";
import ProgressBar from "@/components/ProgressBar";
import { lucasLessons, lucasProgress } from "@/lib/mock-data";

export default function AlunoDashboard() {
  const { progressPercent, lessonsCompleted, lessonsTotal, exercisesTotal, streakDays } =
    lucasProgress;

  return (
    <div style={{ paddingTop: "1rem", display: "flex", flexDirection: "column", gap: 10 }}>
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: "#6B6B6B", marginBottom: 2 }}>
              Progresso no nível A2
            </div>
          </div>
          <span style={{ fontSize: 18, fontWeight: 500, color: "#1A1A1A" }}>
            {progressPercent}%
          </span>
        </div>

        <ProgressBar percent={progressPercent} color="#1D9E75" height={8} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginTop: 14,
          }}
        >
          {[
            { label: "Aulas", value: `${lessonsCompleted} / ${lessonsTotal}` },
            { label: "Exercícios", value: String(exercisesTotal) },
            { label: "Sequência", value: `${streakDays} dias` },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: "#9A9A9A", marginTop: 2 }}>
                {label}
              </div>
            </div>
          ))}
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
          marginBottom: 2,
        }}
      >
        Suas aulas
      </div>

      {lucasLessons.map((lesson) => (
        <LessonCard
          key={lesson.id}
          id={lesson.id}
          date={lesson.date}
          title={lesson.title}
          status={lesson.status}
          exercisesDone={lesson.exercisesDone}
          exercisesTotal={lesson.exercisesTotal}
        />
      ))}
    </div>
  );
}
