// Regras dos arquivos enviados, usadas no navegador (para avisar antes de
// enviar) e no servidor (que é quem decide). O servidor confere de novo o
// tamanho e o tipo reais no armazenamento antes de aceitar o arquivo.

export const MB = 1024 * 1024;

/** Tipos aceitos na entrega de arquivo, por categoria escolhida pelo professor. */
export const FILE_KINDS = {
  photo: ["image/jpeg", "image/png", "image/webp"],
  pdf: ["application/pdf"],
  audio: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg", "audio/wav", "audio/x-wav", "audio/webm"],
} as const;
export type FileKind = keyof typeof FILE_KINDS;
export const FILE_KIND_LIST = Object.keys(FILE_KINDS) as FileKind[];
export const FILE_KIND_LABELS: Record<FileKind, string> = { photo: "Foto", pdf: "PDF", audio: "Áudio" };

/** Mídias do professor (questões e textos). */
export const MEDIA_RULES = {
  image: { types: [...FILE_KINDS.photo, "image/gif"] as string[], maxBytes: 5 * MB },
  audio: { types: [...FILE_KINDS.audio] as string[], maxBytes: 20 * MB },
};
export type MediaKind = keyof typeof MEDIA_RULES;

/** Limites da entrega de arquivo (o professor escolhe dentro deles). */
export const SUBMISSION_LIMITS = { maxFiles: 5, maxMB: 20 };

export function kindOf(contentType: string): FileKind | null {
  for (const k of FILE_KIND_LIST) if ((FILE_KINDS[k] as readonly string[]).includes(contentType)) return k;
  return null;
}

export function typesFor(kinds: FileKind[]): string[] {
  return kinds.flatMap((k) => [...FILE_KINDS[k]]);
}

/** Endereço interno de um arquivo; o tipo vai no endereço para o player saber se é áudio. */
export function fileUrl(id: string, media?: MediaKind): string {
  return media ? `/arquivos/${id}?tipo=${media === "audio" ? "audio" : "imagem"}` : `/arquivos/${id}`;
}

const FILE_URL_RE = /^\/arquivos\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\?tipo=(audio|imagem))?$/i;

/** Id do arquivo se a URL for um /arquivos/<id> deste app. */
export function fileIdFromUrl(url: string | undefined | null): string | null {
  return FILE_URL_RE.exec(url ?? "")?.[1]?.toLowerCase() ?? null;
}

export function isAudioUrl(url: string): boolean {
  return /\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(url) || /^\/arquivos\/[^?]+\?tipo=audio$/.test(url);
}

/** Nome seguro para guardar e mostrar (sem caminho, sem caracteres de controle). */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[\u0000-\u001f\u007f"<>|*?:]/g, "").trim().slice(0, 120);
  return clean || "arquivo";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < MB) return `${Math.round(n / 1024)} KB`;
  return `${(n / MB).toFixed(1).replace(".", ",")} MB`;
}

/** Nome e tamanho por id, para as listas de arquivos das entregas. */
export function fileInfoMap(list: { id: string; originalName: string; sizeBytes: number }[]): Record<string, { name: string; size: number }> {
  return Object.fromEntries(list.map((f) => [f.id, { name: f.originalName, size: f.sizeBytes }]));
}
