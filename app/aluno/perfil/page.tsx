import { Download } from "lucide-react";
import { requireStudent } from "@/server/auth/session";
import { requestDeletion } from "@/server/actions/account";
import ContactForm from "@/components/student/ContactForm";
import PasswordForm from "@/components/PasswordForm";
import ConfirmButton from "@/components/ConfirmButton";
import { ButtonLink, Card, Notice, PageHeader } from "@/components/ui";
import { subjects } from "@/server/db/repo";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Meu perfil" };

export default async function PerfilPage() {
  const { user, student, teacher, scope } = await requireStudent();
  const subjectList = await subjects.all(scope);
  const levels = subjectList.filter((s) => student.levels[s.id]).map((s) => {
    const code = student.levels[s.id];
    return { name: s.name, text: `${code} · ${s.levels.find((l) => l.code === code)?.label ?? ""}` };
  });
  return (
    <>
      <PageHeader title="Meu perfil" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Seus dados</h2>
          <dl className="mb-4 grid grid-cols-3 gap-y-1.5 text-sm">
            <dt className="text-ink-3">Nome</dt><dd className="col-span-2">{student.name}</dd>
            <dt className="text-ink-3">E-mail</dt><dd className="col-span-2 truncate">{user.email}</dd>
            {levels.map((l) => (
              <div key={l.name} className="contents">
                <dt className="text-ink-3">{levels.length > 1 ? `Nível · ${l.name}` : "Nível"}</dt>
                <dd className="col-span-2">{l.text}</dd>
              </div>
            ))}
            <dt className="text-ink-3">Professor</dt><dd className="col-span-2">{teacher.name}</dd>
            {student.goal && (<><dt className="text-ink-3">Objetivo</dt><dd className="col-span-2">{student.goal}</dd></>)}
          </dl>
          <p className="mb-3 text-xs text-ink-3">Para mudar nome, e-mail ou outros dados, fale com seu professor.</p>
          <ContactForm phone={student.phone} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Senha</h2>
          <PasswordForm />
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-sm font-semibold">Privacidade</h2>
          <p className="mb-3 text-sm text-ink-2">Você pode baixar uma cópia de tudo que está guardado sobre você ou pedir a exclusão dos seus dados.</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/aluno/perfil/exportar" variant="secondary" prefetch={false}><Download size={15} /> Baixar meus dados</ButtonLink>
            {!student.deletionRequestedAt && (
              <form action={requestDeletion}>
                <ConfirmButton variant="danger" message="Pedir ao professor a exclusão de todos os seus dados? Você perderá o acesso quando ele confirmar.">
                  Pedir exclusão dos meus dados
                </ConfirmButton>
              </form>
            )}
          </div>
          {student.deletionRequestedAt && (
            <div className="mt-3"><Notice variant="warning">Exclusão pedida em {formatDate(student.deletionRequestedAt)}. Seu professor foi avisado.</Notice></div>
          )}
        </Card>
      </div>
    </>
  );
}
