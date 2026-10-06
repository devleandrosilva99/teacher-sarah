import Link from "next/link";
import { markAllRead } from "@/server/actions/account";
import { notifications } from "@/server/db/repo";
import { Button, EmptyState, PageHeader, cx } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export default async function NotificationList({ userId }: { userId: string }) {
  const list = (await notifications.list(userId)).slice(0, 100);
  const unread = list.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        title="Notificações"
        actions={
          unread > 0 ? (
            <form action={markAllRead}>
              <Button type="submit" variant="secondary">Marcar todas como lidas</Button>
            </form>
          ) : undefined
        }
      />
      {list.length === 0 ? (
        <EmptyState title="Nenhuma notificação" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {list.map((n) => (
            <Link key={n.id} href={n.href} className={cx("flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-page", !n.readAt && "bg-brand-soft/40")}>
              <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-brand")} />
              <div className="flex-1">
                <div className="text-sm">{n.text}</div>
                <div className="text-xs text-ink-3">{formatDateTime(n.createdAt)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
