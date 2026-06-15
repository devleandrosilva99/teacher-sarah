import Link from "next/link";
import TeacherAvatar from "@/components/TeacherAvatar";
import { ArrowLeft } from "lucide-react";

export default function ProfessoraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F4EF" }}>
      <header
        style={{
          backgroundColor: "#F5F4EF",
          padding: "1rem 1.25rem 0.75rem",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "0.5px solid rgba(0,0,0,0.08)",
        }}
      >
        <Link
          href="/login"
          aria-label="Voltar ao login"
          style={{ color: "#6B6B6B", display: "flex" }}
        >
          <ArrowLeft size={20} />
        </Link>
        <TeacherAvatar />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>
            Sarah Ramos
          </div>
          <div style={{ fontSize: 12, color: "#6B6B6B" }}>Teacher · Admin</div>
        </div>
      </header>
      <main style={{ padding: "0 1.25rem 2rem" }}>{children}</main>
    </div>
  );
}
