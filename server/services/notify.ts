import "server-only";
import { notifications } from "@/server/db/repo";
import { newId, nowIso } from "@/lib/format";

export async function notify(userId: string | undefined, text: string, href: string): Promise<void> {
  if (!userId) return;
  await notifications.put({ id: newId(), userId, text, href, createdAt: nowIso(), readAt: "" });
}

export async function unreadCount(userId: string): Promise<number> {
  return (await notifications.list(userId)).filter((n) => !n.readAt).length;
}
