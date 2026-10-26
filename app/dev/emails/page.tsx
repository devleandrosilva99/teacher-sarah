import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { OUTBOX_DIR } from "@/server/mail";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

// Caixa de saída do desenvolvimento local (e-mails gravados em .data/outbox/).
// Não existe em produção nem na Vercel.
export const metadata = { title: "E-mails (desenvolvimento)", robots: { index: false } };
export const dynamic = "force-dynamic";

interface Saved {
  to: string;
  subject: string;
  text: string;
  sentAt: string;
}

export default async function DevEmailsPage() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) notFound();
  const files = (await fs.readdir(OUTBOX_DIR).catch(() => [] as string[])).filter((f) => f.endsWith(".json")).sort().reverse().slice(0, 50);
  const mails = await Promise.all(
    files.map(async (f) => ({ file: f, ...(JSON.parse(await fs.readFile(path.join(OUTBOX_DIR, f), "utf8")) as Saved) }))
  );
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader title="Caixa de saída" subtitle="E-mails do desenvolvimento local (SMTP não configurado). Os mais recentes primeiro." />
      {mails.length === 0 ? (
        <EmptyState title="Nenhum e-mail ainda" />
      ) : (
        <div className="flex flex-col gap-3">
          {mails.map((m) => (
            <Card key={m.file}>
              <div className="text-xs text-ink-3">{formatDateTime(m.sentAt)} · para {m.to}</div>
              <div className="mb-2 font-medium">{m.subject}</div>
              <pre className="whitespace-pre-wrap break-all text-sm text-ink-2">{linkify(m.text)}</pre>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function linkify(text: string) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} className="text-brand underline">{part}</a>
    ) : (
      part
    )
  );
}
