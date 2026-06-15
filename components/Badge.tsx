type BadgeVariant = "success" | "warning" | "danger" | "info" | "purple";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const styles: Record<BadgeVariant, { bg: string; color: string }> = {
  success: { bg: "#E1F5EE", color: "#0F6E56" },
  warning: { bg: "#FAEEDA", color: "#854F0B" },
  danger: { bg: "#FCEBEB", color: "#A32D2D" },
  info: { bg: "#E6F1FB", color: "#0C447C" },
  purple: { bg: "#EEEDFE", color: "#3C3489" },
};

export default function Badge({ variant, children }: BadgeProps) {
  const s = styles[variant];
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.color,
        fontSize: 12,
        fontWeight: 500,
        padding: "3px 8px",
        borderRadius: 8,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </span>
  );
}
