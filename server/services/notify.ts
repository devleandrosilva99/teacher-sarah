import "server-only";
import { notifications, type Repo } from "@/server/db/repo";

/** Cria uma notificação dentro da transação em andamento. */
export async function notify(r: Repo, userId: string | undefined, text: string, href: string): Promise<void> {
  if (!userId) return;
  await r.notifications.add(userId, text, href);
}

export async function unreadCount(userId: string): Promise<number> {
  return notifications.unreadCount(userId);
}
