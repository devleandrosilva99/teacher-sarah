interface AvatarProps {
  initials: string;
  bgColor: string;
  textColor: string;
  size?: number;
}

export default function Avatar({
  initials,
  bgColor,
  textColor,
  size = 36,
}: AvatarProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        color: textColor,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 500,
        flexShrink: 0,
        letterSpacing: "0.01em",
      }}
    >
      {initials}
    </div>
  );
}
