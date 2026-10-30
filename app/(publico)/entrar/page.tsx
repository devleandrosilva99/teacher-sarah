import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { Notice } from "@/components/ui";
import { getCurrentUser, homeFor } from "@/server/auth/session";

export const metadata = { title: "Entrar" };

const MESSAGES: Record<string, string> = {
  arquivado: "Seu acesso foi encerrado pelo professor.",
  bloqueado: "Esta conta está bloqueada no momento.",
};

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ m?: string; next?: string }> }) {
  const { m, next } = await searchParams;
  const user = await getCurrentUser();
  if (user && !m) redirect(homeFor(user.role));

  return (
    <AuthShell
      title="Entrar"
      subtitle="Professores e alunos entram por aqui"
      footer={
        <>
          É professor e ainda não tem conta? <Link href="/cadastro" className="font-medium text-brand">Criar conta</Link>
        </>
      }
    >
      {m && MESSAGES[m] && (
        <div className="mb-4">
          <Notice variant="warning">{MESSAGES[m]}</Notice>
        </div>
      )}
      <LoginForm next={next} />
      <p className="mt-4 text-sm">
        <Link href="/recuperar-senha" className="font-medium text-brand">Esqueci minha senha</Link>
      </p>
    </AuthShell>
  );
}
