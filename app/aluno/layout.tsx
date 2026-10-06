import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import BottomNav from "@/components/nav/BottomNav";
import StorageBanner from "@/components/nav/StorageBanner";
import { Avatar } from "@/components/ui";
import { requireStudent } from "@/server/auth/session";
import { logout } from "@/server/actions/auth";
import { unreadCount } from "@/server/services/notify";
import { LEVEL_LABELS } from "@/lib/types";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const { user, student, teacher } = await requireStudent();
  const unread = await unreadCount(user.id);
  return (
    <div style={{ ["--brand" as string]: teacher.color } as React.CSSProperties} className="min-h-screen">
      <StorageBanner />
      <header className="mx-auto flex max-w-5xl items-center gap-3 px-4 pb-2 pt-4">
        <Avatar name={student.name} color={student.avatarColor} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">Olá, {student.name.split(" ")[0]}!</div>
          <div className="truncate text-xs text-ink-2">
            {student.level} · {LEVEL_LABELS[student.level]} · com {teacher.name}
          </div>
        </div>
        <Link href="/aluno/notificacoes" className="relative rounded-lg p-2 text-ink-2 hover:bg-surface-raised" aria-label="Notificações">
          <Bell size={20} />
          {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand" />}
        </Link>
        <form action={logout}>
          <button className="rounded-lg p-2 text-ink-2 hover:bg-surface-raised" aria-label="Sair" title="Sair">
            <LogOut size={20} />
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
