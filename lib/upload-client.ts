"use client";

// Envio de arquivo pelo navegador: reduz fotos, pede a autorização ao
// servidor, envia direto ao armazenamento (Vercel Blob ou rota local) e pede
// a confirmação. Quem decide tipo e tamanho é sempre o servidor.

type Ticket = { kind: "blob"; pathname: string; clientToken: string } | { kind: "local"; url: string };
type Grant = { fileId: string; ticket: Ticket } | { error: string };

const MAX_SIDE = 1600;
const RESIZABLE = ["image/jpeg", "image/png", "image/webp"];

/** Foto com lado maior até 1600 px, em WebP (ou JPEG) de qualidade média. PDF e áudio passam sem mudança. */
export async function shrinkPhoto(file: File): Promise<File> {
  if (!RESIZABLE.includes(file.type)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1024 * 1024) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.8));
  let blob = await encode("image/webp");
  let type = "image/webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await encode("image/jpeg");
    type = "image/jpeg";
  }
  if (!blob || blob.size >= file.size) return file;
  const base = file.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${base}.${type === "image/webp" ? "webp" : "jpg"}`, { type });
}

export async function uploadFile<C extends object>(
  original: File,
  request: (name: string, type: string, size: number) => Promise<Grant>,
  confirm: (fileId: string) => Promise<C | { error: string }>
): Promise<C | { error: string }> {
  const file = await shrinkPhoto(original);
  const grant = await request(file.name, file.type, file.size);
  if ("error" in grant) return grant;
  try {
    if (grant.ticket.kind === "blob") {
      const { put } = await import("@vercel/blob/client");
      await put(grant.ticket.pathname, file, { access: "private", token: grant.ticket.clientToken, contentType: file.type });
    } else {
      const res = await fetch(grant.ticket.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!res.ok) return { error: res.status === 413 ? "Arquivo grande demais." : "Não foi possível enviar o arquivo." };
    }
  } catch {
    return { error: "Não foi possível enviar o arquivo. Verifique a conexão e tente de novo." };
  }
  return confirm(grant.fileId);
}
