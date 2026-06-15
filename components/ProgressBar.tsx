interface ProgressBarProps {
  percent: number;
  color: string;
  height?: number;
}

export default function ProgressBar({
  percent,
  color,
  height = 8,
}: ProgressBarProps) {
  return (
    <div
      style={{
        width: "100%",
        height,
        backgroundColor: "#EFEDE5",
        borderRadius: height,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(100, percent)}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: height,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}
