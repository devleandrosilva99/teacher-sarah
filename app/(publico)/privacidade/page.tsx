import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: "Política de privacidade" };

export default function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed text-ink-2">
      <Link href="/" className="text-xs">← Início</Link>
      <h1 className="mb-1 mt-4 text-2xl font-medium text-ink">Política de privacidade</h1>
      <p className="mb-6 text-xs text-ink-3">Versão de teste, em conformidade com a LGPD (Lei 13.709/2018). Revise com um advogado antes do lançamento.</p>
      <h2 className="mt-6 font-medium text-ink">Quais dados guardamos</h2>
      <p>Do professor: nome, e-mail e senha (guardada apenas como hash). Do aluno: nome, e-mail e, se o professor preencher, telefone, data de nascimento, responsável, CPF e endereço, que são opcionais. Também guardamos respostas, notas, aulas e anotações.</p>
      <h2 className="mt-6 font-medium text-ink">Para que usamos</h2>
      <p>Somente para o funcionamento do {APP_NAME}: acesso, atividades, correção, progresso e agenda. Não vendemos nem compartilhamos dados com terceiros para publicidade.</p>
      <h2 className="mt-6 font-medium text-ink">Quem vê</h2>
      <p>Os dados de um aluno são vistos apenas por ele e pelo professor que o cadastrou. Um professor não tem acesso aos alunos de outro professor.</p>
      <h2 className="mt-6 font-medium text-ink">Seus direitos</h2>
      <p>O aluno pode baixar uma cópia dos seus dados e pedir a exclusão da conta na página &quot;Meu perfil&quot;. O professor pode exportar e excluir os dados dos seus alunos.</p>
      <h2 className="mt-6 font-medium text-ink">Menores de idade</h2>
      <p>Alunos menores de 18 anos só ativam a conta com autorização do responsável legal.</p>
    </article>
  );
}
