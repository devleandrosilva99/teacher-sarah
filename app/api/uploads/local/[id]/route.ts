import { storageMode, verifyLocalUpload, writeLocalUpload } from "@/server/storage";

// Upload do modo local (desenvolvimento sem BLOB_READ_WRITE_TOKEN). O token
// HMAC vem do servidor no pedido de upload e só vale para este arquivo, este
// tipo e este tamanho máximo, por 10 minutos. Fora do modo local: 404.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (storageMode() !== "local") return new Response(null, { status: 404 });
  const { id } = await params;
  const claims = await verifyLocalUpload(new URL(req.url).searchParams.get("t") ?? "", id);
  if (!claims) return Response.json({ error: "Autorização de envio inválida ou vencida." }, { status: 403 });
  if ((req.headers.get("content-type") ?? "").split(";")[0].trim() !== claims.ct) {
    return Response.json({ error: "Tipo de arquivo diferente do autorizado." }, { status: 415 });
  }
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > claims.max) return Response.json({ error: "Arquivo grande demais." }, { status: 413 });
  if (!req.body) return Response.json({ error: "Arquivo vazio." }, { status: 400 });
  const res = await writeLocalUpload(claims, req.body);
  if ("error" in res) {
    const status = res.error === "too_large" ? 413 : res.error === "exists" ? 409 : 500;
    return Response.json({ error: res.error }, { status });
  }
  return Response.json({ ok: true, size: res.size });
}
