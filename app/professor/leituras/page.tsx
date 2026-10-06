import Link from "next/link";
import { Headphones, FileText, Plus } from "lucide-react";
import { requireTeacher } from "@/server/auth/session";
import { passages, questions } from "@/server/db/repo";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { plural } from "@/lib/format";

export const metadata = { title: "Leituras" };

export default async function LeiturasPage() {
  const { teacher } = await requireTeacher();
  const [ps, qs] = await Promise.all([passages.all(teacher.id), questions.all(teacher.id)]);
  return (
    <>
      <PageHeader
        title="Leituras e áudios"
        subtitle="Um texto (ou áudio) com várias questões. Na atividade, o aluno vê o texto ao lado das perguntas."
        actions={<ButtonLink href="/professor/leituras/nova"><Plus size={16} /> Novo texto</ButtonLink>}
      />
      {ps.length === 0 ? (
        <EmptyState title="Nenhum texto ainda" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ps.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((p) => {
            const n = qs.filter((q) => q.passageId === p.id && q.status !== "archived").length;
            return (
              <Link key={p.id} href={`/professor/leituras/${p.id}`} className="rounded-xl border border-line bg-surface p-4 hover:border-brand">
                <div className="flex items-center gap-2">
                  {p.kind === "reading" ? <FileText size={16} className="text-ink-3" /> : <Headphones size={16} className="text-ink-3" />}
                  <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                  {p.level && <Badge variant="info">{p.level}</Badge>}
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-ink-2">{p.text || "Áudio"}</p>
                <p className="mt-2 text-xs text-ink-3">{plural(n, "questão", "questões")}</p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
