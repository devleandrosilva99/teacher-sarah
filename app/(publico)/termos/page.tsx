import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: "Termos de uso" };

export default function TermosPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed text-ink-2">
      <Link href="/" className="text-xs">← Início</Link>
      <h1 className="mb-1 mt-4 text-2xl font-medium text-ink">Termos de uso</h1>
      <p className="mb-6 text-xs text-ink-3">Versão de teste. Revise com um advogado antes do lançamento.</p>
      <h2 className="mt-6 font-medium text-ink">1. O serviço</h2>
      <p>O {APP_NAME} permite que professores de inglês cadastrem alunos, criem questões e atividades, corrijam respostas e acompanhem o progresso.</p>
      <h2 className="mt-6 font-medium text-ink">2. Contas</h2>
      <p>O professor é responsável pelos dados dos alunos que cadastra e por obter as autorizações necessárias, inclusive de responsáveis por alunos menores de idade. Cada pessoa deve manter sua senha em sigilo.</p>
      <h2 className="mt-6 font-medium text-ink">3. Conteúdo</h2>
      <p>As questões e textos criados pelo professor pertencem a ele. O professor declara ter direito de uso sobre os textos, imagens e áudios que publicar.</p>
      <h2 className="mt-6 font-medium text-ink">4. Uso adequado</h2>
      <p>É proibido usar a plataforma para fins ilegais, tentar acessar dados de outros professores ou alunos, ou interferir no funcionamento do serviço. Contas que violarem estes termos podem ser bloqueadas.</p>
      <h2 className="mt-6 font-medium text-ink">5. Período de testes</h2>
      <p>Durante o período de testes o serviço é gratuito e pode passar por mudanças e interrupções.</p>
    </article>
  );
}
