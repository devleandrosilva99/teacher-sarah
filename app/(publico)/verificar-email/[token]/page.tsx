import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { Notice } from "@/components/ui";
import { confirmEmail } from "@/server/services/auth-email";
import { getCurrentUser, homeFor } from "@/server/auth/session";

export const metadata = { title: "Confirmar e-mail", referrer: "no-referrer" as const };

export default async function VerificarEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = await confirmEmail(token);
  const user = await getCurrentUser();
  const next = user ? homeFor(user.role) : "/entrar";
  return (
    <AuthShell title={ok ? "E-mail confirmado" : "Link inválido"}>
      <div className="flex flex-col gap-4">
        {ok ? (
          <Notice variant="success">Pronto! Seu e-mail foi confirmado.</Notice>
        ) : (
          <Notice variant="warning">Este link expirou ou já foi usado. Entre na sua conta e peça um novo link de confirmação.</Notice>
        )}
        <Link href={next} className="text-sm font-medium text-brand">{user ? "Ir para o início" : "Entrar"}</Link>
      </div>
    </AuthShell>
  );
}
