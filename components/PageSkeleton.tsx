// Esqueleto exibido enquanto a página carrega (app/professor/loading.tsx e
// app/aluno/loading.tsx). O layout aparece na hora; só o conteúdo espera.
export default function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Carregando…</span>
      <div className="mb-2 h-7 w-48 rounded-lg bg-surface-raised" />
      <div className="mb-6 h-4 w-72 max-w-full rounded bg-surface-raised" />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="h-20 rounded-xl border border-line bg-surface" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-16 rounded-xl border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}
