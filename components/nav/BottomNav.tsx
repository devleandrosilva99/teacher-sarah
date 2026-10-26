"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, ClipboardList, Home, User } from "lucide-react";
import { cx } from "@/components/ui";

const items = [
  { href: "/aluno", label: "Início", icon: Home, exact: true },
  { href: "/aluno/atividades", label: "Atividades", icon: ClipboardList },
  { href: "/aluno/agenda", label: "Aulas", icon: CalendarDays },
  { href: "/aluno/progresso", label: "Progresso", icon: BarChart3 },
  { href: "/aluno/perfil", label: "Perfil", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.endsWith("/fazer")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-3xl">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} className={cx("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-brand" : "text-ink-3")}>
              <it.icon size={20} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
