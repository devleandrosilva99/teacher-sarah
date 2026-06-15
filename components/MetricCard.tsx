interface MetricCardProps {
  label: string;
  value: string;
  valueColor?: string;
}

export default function MetricCard({
  label,
  value,
  valueColor = "#1A1A1A",
}: MetricCardProps) {
  return (
    <div
      style={{
        backgroundColor: "#EFEDE5",
        borderRadius: 12,
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span style={{ fontSize: 12, color: "#6B6B6B", fontWeight: 400 }}>
        {label}
      </span>
      <span style={{ fontSize: 22, fontWeight: 500, color: valueColor }}>
        {value}
      </span>
    </div>
  );
}
