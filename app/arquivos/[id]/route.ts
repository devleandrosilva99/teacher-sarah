import { currentFileViewer } from "@/server/auth/session";
import { fileForViewer } from "@/server/services/files";
import { storage } from "@/server/storage";

// Download de um arquivo enviado. A permissão é a da RLS no escopo de quem
// pede (ver migração 0004); qualquer recusa, inclusive sem login, é 404, para
// não revelar se o arquivo existe.
const notFound = () => new Response("Arquivo não encontrado.", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await fileForViewer(await currentFileViewer(), id);
  if (!file) return notFound();
  const store = storage();
  const signed = await store.downloadUrl(file.storageKey);
  if (signed) {
    // Vercel Blob: URL assinada válida por 5 minutos.
    return new Response(null, { status: 302, headers: { Location: signed, "Cache-Control": "private, no-store" } });
  }
  const body = await store.read(file.storageKey);
  if (!body) return notFound();
  return new Response(body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.sizeBytes),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // O arquivo nunca roda como página do app.
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; media-src 'self'",
    },
  });
}
