import BottomNav from "@/components/BottomNav";
import { Bell, User } from "lucide-react";
import Avatar from "@/components/Avatar";

export default function AlunoLayout({
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
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <Avatar
          initials="LM"
          bgColor="#E6F1FB"
          textColor="#0C447C"
          size={40}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#1A1A1A" }}>
            Olá, Lucas!
          </div>
          <div style={{ fontSize: 12, color: "#6B6B6B" }}>
            Nível atual: A2 — Pre-Intermediate
          </div>
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
            aria-label="Perfil"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              color: "#6B6B6B",
            }}
          >
            <User size={20} />
          </button>
        </div>
      </header>

      <main style={{ padding: "0 1.25rem 6rem" }}>{children}</main>

      <BottomNav />
    </div>
  );
}
