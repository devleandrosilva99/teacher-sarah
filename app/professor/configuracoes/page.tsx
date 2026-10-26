import { requireTeacher } from "@/server/auth/session";
import { baseUrl } from "@/server/url";
import SettingsForm from "@/components/teacher/SettingsForm";
import PasswordForm from "@/components/PasswordForm";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const { user, teacher } = await requireTeacher();
  const base = await baseUrl();
  return (
    <>
      <PageHeader title="Configurações" subtitle={`Conta: ${user.email}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Sua página</h2>
          <SettingsForm teacher={teacher} base={base} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Senha</h2>
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
