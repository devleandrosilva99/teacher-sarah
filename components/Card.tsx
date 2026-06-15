interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function Card({ children, className = "", style }: CardProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: "#FFFFFF",
        border: "0.5px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: "1rem 1.25rem",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
