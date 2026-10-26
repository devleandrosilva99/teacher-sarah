import { formatDate } from "@/lib/format";
import { ProgressBar } from "./ui";

/** Evolução das notas (%) ao longo do tempo. */
export function ScoreHistory({ points }: { points: { date: string; title: string; percent: number }[] }) {
  if (points.length === 0) return <p className="text-sm text-ink-3">As notas aparecem aqui depois das primeiras correções.</p>;
  const W = 560, H = 160, L = 32, R = 12, T = 12, B = 24;
  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (p: number) => T + ((100 - p) * (H - T - B)) / 100;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.percent)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolução das notas">
      {[0, 50, 70, 100].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="rgba(0,0,0,0.07)" strokeDasharray={g === 70 ? "4 4" : undefined} />
          <text x={L - 6} y={y(g) + 3} textAnchor="end" fontSize="10" fill="#9a9a9a">{g}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--brand)" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.percent)} r="3.5" fill="var(--brand)">
            <title>{`${p.title}: ${p.percent}% (${formatDate(p.date)})`}</title>
          </circle>
        </g>
      ))}
      <text x={L} y={H - 6} fontSize="10" fill="#9a9a9a">{formatDate(points[0].date)}</text>
      {points.length > 1 && (
        <text x={W - R} y={H - 6} fontSize="10" fill="#9a9a9a" textAnchor="end">{formatDate(points[points.length - 1].date)}</text>
      )}
    </svg>
  );
}

export function SkillBars({ skills }: { skills: { skill: string; label: string; percent: number; answered: number }[] }) {
  if (skills.length === 0) return <p className="text-sm text-ink-3">Sem respostas corrigidas ainda.</p>;
  return (
    <div className="flex flex-col gap-3">
      {skills
        .sort((a, b) => b.percent - a.percent)
        .map((s) => (
          <div key={s.skill}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-ink-2">{s.label}</span>
              <span className="font-medium">{s.percent}%</span>
            </div>
            <ProgressBar value={s.percent} />
          </div>
        ))}
    </div>
  );
}
