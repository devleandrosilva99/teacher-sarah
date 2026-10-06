import AuthShell from "@/components/auth/AuthShell";
import InviteForm from "@/components/auth/InviteForm";
import { Notice } from "@/components/ui";
import { invitations, students, teachers } from "@/server/db/repo";

export const metadata = { title: "Ativar conta" };

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await invitations.get(token);
  const valid = inv && !inv.usedAt && new Date(inv.expiresAt).getTime() > Date.now();
  const teacher = inv ? await teachers.get(inv.teacherId) : null;
  const student = inv ? await students.get(inv.teacherId, inv.studentId) : null;

  if (!valid || !teacher || !student) {
    return (
      <AuthShell title="Convite inválido">
        <Notice variant="warning">Este link expirou ou já foi usado. Peça um novo link ao seu professor.</Notice>
      </AuthShell>
    );
  }

  let minor = false;
  if (student.birthDate) {
    const age = (Date.now() - new Date(student.birthDate).getTime()) / (365.25 * 86_400_000);
    minor = age < 18;
  }

  return (
    <AuthShell
      title={`Olá, ${student.name.split(" ")[0]}!`}
      subtitle={`${teacher.name} convidou você. Crie sua senha para acessar.`}
      brand={{ name: teacher.name, color: teacher.color }}
    >
      <p className="mb-4 text-sm text-ink-2">
        Seu e-mail de acesso: <span className="font-medium text-ink">{inv.email}</span>
      </p>
      <InviteForm token={token} minor={minor} />
    </AuthShell>
  );
}
