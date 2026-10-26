import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";
import { getCurrentUser, homeFor } from "@/server/auth/session";

export const metadata = { title: "Criar conta de professor" };

export default async function CadastroPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <AuthShell
      title="Criar conta de professor"
      subtitle="Gratuito durante o período de testes"
      footer={
        <>
          Já tem conta? <Link href="/entrar" className="font-medium text-brand">Entrar</Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
