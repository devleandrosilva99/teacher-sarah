import { requireStudent } from "@/server/auth/session";
import NotificationList from "@/components/NotificationList";

export const metadata = { title: "Notificações" };

export default async function NotificacoesAlunoPage() {
  const { user } = await requireStudent();
  return <NotificationList userId={user.id} />;
}
