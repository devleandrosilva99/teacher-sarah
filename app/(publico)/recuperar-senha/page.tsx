import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ForgotForm from "@/components/auth/ForgotForm";

export const metadata = { title: "Recuperar senha" };

export default function RecuperarSenhaPage() {
  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviamos um link para você criar uma nova senha"
      footer={<Link href="/entrar" className="font-medium text-brand">Voltar para entrar</Link>}
    >
      <ForgotForm />
    </AuthShell>
  );
}
