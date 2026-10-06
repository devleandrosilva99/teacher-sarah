import { requireTeacher } from "@/server/auth/session";
import NotificationList from "@/components/NotificationList";

export const metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  const { user } = await requireTeacher();
  return <NotificationList userId={user.id} />;
}
