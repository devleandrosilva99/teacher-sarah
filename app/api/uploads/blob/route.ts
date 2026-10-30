import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { currentFileViewer } from "@/server/auth/session";
import { blobAuth, presignedUploadToken } from "@/server/storage";

// Upload direto do navegador para o Vercel Blob quando o store está ligado
// por OIDC (sem BLOB_READ_WRITE_TOKEN). O navegador chega aqui só depois do
// pedido de envio (server/services/files.ts), que já conferiu permissão, tipo
// e tamanho e devolveu uma autorização assinada (clientPayload). Esta rota só
// emite a URL pré-assinada para aquela chave, aquele tipo e aquele tamanho.
// A confirmação é feita pelo próprio app (confirmUpload), então o aviso de
// "upload concluído" do Blob não é usado e é recusado.
export async function POST(request: Request) {
  if (blobAuth()?.kind !== "oidc") return new Response(null, { status: 404 });
  if (!(await currentFileViewer())) return Response.json({ error: "Sem sessão." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as HandleUploadPresignedBody | null;
  if (body?.type !== "blob.generate-presigned-url") return Response.json({ error: "Pedido inválido." }, { status: 400 });
  try {
    const result = await handleUploadPresigned({
      body,
      request,
      getSignedToken: (pathname, clientPayload) => presignedUploadToken(clientPayload, pathname),
    });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Falha ao autorizar o envio." }, { status: 400 });
  }
}
