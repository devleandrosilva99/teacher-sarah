import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ResetForm from "@/components/auth/ResetForm";
import { Notice } from "@/components/ui";
import { resetTokenValid } from "@/server/services/auth-email";

// O token está no endereço: não vai como Referer para nenhum outro site.
export const metadata = { title: "Nova senha", referrer: "no-referrer" as const };

export default async function RedefinirSenhaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await resetTokenValid(token))) {
    return (
      <AuthShell title="Link inválido" footer={<Link href="/entrar" className="font-medium text-brand">Voltar para entrar</Link>}>
        <div className="flex flex-col gap-4">
          <Notice variant="warning">Este link expirou ou já foi usado. Os links valem por 1 hora e só uma vez.</Notice>
          <Link href="/recuperar-senha" className="text-sm font-medium text-brand">Pedir um novo link</Link>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Criar nova senha" subtitle="Depois de salvar, as outras sessões abertas da sua conta são encerradas">
      <ResetForm token={token} />
    </AuthShell>
  );
}
