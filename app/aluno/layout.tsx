"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import { getSession, clearSession } from "@/lib/auth";
import { students, loadAddedStudents, Student } from "@/lib/mock-data";

export default function AlunoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "aluno") {
      router.replace("/login");
      return;
    }
    const all = [...students, ...loadAddedStudents()];
    const found = all.find((x) => x.id === s.userId) ?? null;
    setStudent(found);
    setChecked(true);
  }, [router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!checked) return null;

  const firstName = student?.name.split(" ")[0] ?? "aluno";
  const levelText = student
    ? `Nível atual: ${student.level} — ${student.levelLabel}`
    : "";
  const initials = student?.initials ?? "??";
  const avatarBg = student?.avatarColor ?? "#E6F1FB";
  const avatarFg = student?.avatarTextColor ?? "#0C447C";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F4EF" }}>
      <header
        style={{
          backgroundColor: "#F5F4EF",
          padding: "1rem 1.25rem 0.75rem",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <Avatar
          initials={initials}
          bgColor={avatarBg}
          textColor={avatarFg}
          size={40}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#1A1A1A" }}>
            Olá, {firstName}!
          </div>
          <div style={{ fontSize: 12, color: "#6B6B6B" }}>{levelText}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            aria-label="Notificações"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              color: "#6B6B6B",
            }}
          >
            <Bell size={20} />
          </button>
          <button
            onClick={handleLogout}
            aria-label="Sair"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              color: "#6B6B6B",
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main style={{ padding: "0 1.25rem 6rem" }}>{children}</main>

      <BottomNav />
    </div>
  );
}
