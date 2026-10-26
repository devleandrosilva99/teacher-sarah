import Link from "next/link";
import { LogOut } from "lucide-react";
import SideNav, { type NavItem } from "@/components/nav/SideNav";
import { Avatar } from "@/components/ui";
import { requireTeacher } from "@/server/auth/session";
import { logout } from "@/server/actions/auth";
import { withScope } from "@/server/db/repo";
import { APP_NAME } from "@/lib/brand";

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const { user, teacher } = await requireTeacher();
  const [toGrade, unread] = await withScope(teacher.id, (r) =>
    Promise.all([r.submissions.countByStatus("submitted"), r.notifications.unreadCount(user.id)])
  );

  const items: NavItem[] = [
    { href: "/professor", label: "Início", icon: "home", exact: true },
    { href: "/professor/alunos", label: "Alunos", icon: "users" },
    { href: "/professor/turmas", label: "Turmas", icon: "classes" },
    { href: "/professor/questoes", label: "Questões", icon: "questions" },
    { href: "/professor/leituras", label: "Leituras", icon: "passages" },
    { href: "/professor/atividades", label: "Atividades", icon: "activities" },
    { href: "/professor/correcao", label: "Correção", icon: "grading", badge: toGrade },
    { href: "/professor/agenda", label: "Agenda", icon: "calendar" },
    { href: "/professor/relatorios", label: "Relatórios", icon: "reports" },
    { href: "/professor/notificacoes", label: "Notificações", icon: "bell", badge: unread },
    { href: "/professor/configuracoes", label: "Configurações", icon: "settings" },
  ];

  return (
    <div style={{ ["--brand" as string]: teacher.color } as React.CSSProperties} className="min-h-screen">
      <div className="lg:flex">
        <aside className="sticky top-0 z-30 border-b border-line bg-page lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-4 py-3 lg:py-5">
            <Avatar name={teacher.name} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{teacher.name}</div>
              <Link href={`/p/${teacher.slug}`} className="block truncate text-xs text-ink-3 hover:text-ink-2" target="_blank">
                /p/{teacher.slug}
              </Link>
            </div>
            <form action={logout}>
              <button className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-raised" aria-label="Sair" title="Sair">
                <LogOut size={17} />
              </button>
            </form>
          </div>
          <SideNav items={items} />
          <p className="mt-6 hidden px-6 text-xs text-ink-3 lg:block">{APP_NAME}</p>
        </aside>
        <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
