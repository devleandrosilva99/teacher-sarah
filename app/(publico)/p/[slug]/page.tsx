import { notFound } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { teachers, users } from "@/server/db/repo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await teachers.bySlug(slug);
  return { title: t ? t.name : "Professor" };
}

export default async function TeacherPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const teacher = await teachers.bySlug(slug);
  if (!teacher) notFound();
  const owner = await users.get(teacher.userId);
  if (!owner || owner.blocked) notFound();

  return (
    <AuthShell
      title={teacher.name}
      subtitle={teacher.bio || "Área do aluno"}
      brand={{ name: teacher.name, color: teacher.color }}
      footer="Ainda não tem acesso? Peça o link de convite ao seu professor."
    >
      <LoginForm />
    </AuthShell>
  );
}
