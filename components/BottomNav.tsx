"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, User } from "lucide-react";

const navItems = [
  { href: "/aluno", icon: Home, label: "Início" },
  { href: "/aluno/progresso", icon: BarChart3, label: "Progresso" },
  { href: "/aluno/perfil", icon: User, label: "Perfil" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderTop: "0.5px solid rgba(0,0,0,0.08)",
        display: "flex",
        justifyContent: "space-around",
        padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
        zIndex: 50,
      }}
    >
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive =
          href === "/aluno" ? pathname === "/aluno" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              color: isActive ? "#1A1A1A" : "#9A9A9A",
              textDecoration: "none",
              padding: "4px 16px",
            }}
          >
            <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 500 : 400 }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
