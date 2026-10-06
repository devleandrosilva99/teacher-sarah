import { redirect } from "next/navigation";
import { BookOpenCheck, CalendarDays, ClipboardList, LineChart, ShieldCheck, Users } from "lucide-react";
import { getCurrentUser, homeFor } from "@/server/auth/session";
import { ButtonLink } from "@/components/ui";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

const features = [
  { icon: Users, title: "Seus alunos, só seus", text: "Cada professor tem seu espaço, sua página e seus alunos. Ninguém vê os dados de outro professor." },
  { icon: BookOpenCheck, title: "Banco de questões", text: "Múltipla escolha, verdadeiro ou falso, lacunas, associação, ordenar, respostas abertas e leitura." },
  { icon: ClipboardList, title: "Atividades e correção", text: "Monte listas, atribua a alunos ou turmas e deixe a correção automática fazer o trabalho." },
  { icon: LineChart, title: "Progresso", text: "Notas por habilidade, evolução no tempo e as questões que a turma mais erra." },
  { icon: CalendarDays, title: "Agenda de aulas", text: "Aulas avulsas ou semanais, presença, anotações e vocabulário de cada aula." },
  { icon: ShieldCheck, title: "Privacidade", text: "Senhas protegidas, gabarito que só chega ao aluno depois da entrega e dados exportáveis." },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <header className="flex items-center justify-between">
        <span className="text-base font-semibold">{APP_NAME}</span>
        <ButtonLink href="/entrar" variant="secondary">
          Entrar
        </ButtonLink>
      </header>

      <section className="py-14 text-center sm:py-20">
        <h1 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">{APP_TAGLINE}</h1>
        <p className="mx-auto mt-4 max-w-xl text-ink-2">
          Crie questões, passe atividades, corrija e acompanhe a evolução de cada aluno em um só lugar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/cadastro">Criar conta de professor</ButtonLink>
          <ButtonLink href="/entrar" variant="secondary">
            Sou aluno
          </ButtonLink>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-line bg-surface p-5">
            <f.icon size={20} className="text-brand" />
            <h2 className="mt-3 text-sm font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-ink-2">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="mt-16 flex flex-wrap justify-center gap-4 text-xs text-ink-3">
        <a href="/termos">Termos de uso</a>
        <a href="/privacidade">Política de privacidade</a>
      </footer>
    </div>
  );
}
