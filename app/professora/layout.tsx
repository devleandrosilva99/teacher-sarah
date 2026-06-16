"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import TeacherAvatar from "@/components/TeacherAvatar";
import { getSession, clearSession } from "@/lib/auth";

export default function ProfessoraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "professora") {
      router.replace("/login");
      return;
    }
    setChecked(true);
  }, [router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!checked) return null;

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
        <TeacherAvatar />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>
            Sarah Ramos
          </div>
          <div style={{ fontSize: 12, color: "#6B6B6B" }}>Teacher · Admin</div>
        </div>
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
            display: "flex",
          }}
        >
          <LogOut size={20} />
        </button>
      </header>
      <main style={{ padding: "0 1.25rem 2rem" }}>{children}</main>
    </div>
  );
}
