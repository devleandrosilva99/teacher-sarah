import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { meta } from "@/server/db/repo";

// Armazenamento dos arquivos enviados. Três modos:
//   * blob:  Vercel Blob privado, com uma de duas autenticações:
//              - OIDC (o padrão da Vercel ao ligar um store): BLOB_STORE_ID
//                mais o token OIDC de curta duração que a Vercel injeta em cada
//                requisição (VERCEL_OIDC_TOKEN). O navegador envia por uma URL
//                pré-assinada pedida à rota /api/uploads/blob
//                (handleUploadPresigned), que só a emite para a chave, o tipo e
//                o tamanho autorizados antes pelo servidor;
//              - BLOB_READ_WRITE_TOKEN (token fixo): o navegador envia com um
//                token de cliente com as mesmas restrições.
//            Nas duas, o download sai por uma URL assinada de 5 minutos;
//   * local: desenvolvimento local sem token. Os arquivos ficam em
//            .data/uploads/ (fora do Git); o envio passa pela rota
//            /api/uploads/local/[id] com um token HMAC de validade curta;
//   * off:   na Vercel sem token (o disco lá é somente leitura). O envio de
//            arquivos fica desativado com aviso; o resto do app funciona.

export type StorageMode = "blob" | "local" | "off";

export type UploadTicket =
  | { kind: "blob"; pathname: string; clientToken: string }
  | { kind: "blob-presigned"; pathname: string; handleUploadUrl: string; clientPayload: string }
  | { kind: "local"; url: string };

export interface StorageAdapter {
  mode: StorageMode;
  createUpload(p: { fileId: string; key: string; contentType: string; maxBytes: number }): Promise<UploadTicket>;
  head(key: string): Promise<{ size: number; contentType: string } | null>;
  /** Endereço temporário para baixar (blob) ou null quando o próprio app serve o arquivo (local). */
  downloadUrl(key: string): Promise<string | null>;
  /** Conteúdo do arquivo (só no modo local). */
  read(key: string): Promise<ReadableStream<Uint8Array> | null>;
  delete(keys: string[]): Promise<void>;
}

export const UPLOADS_UNAVAILABLE = "O envio de arquivos ainda não está configurado. Fale com o suporte.";
const UPLOAD_TTL_MS = 10 * 60_000;
const DOWNLOAD_TTL_MS = 5 * 60_000;

/** Como o app se autentica no Vercel Blob (null = não configurado). O token fixo tem preferência. */
export function blobAuth(): { kind: "token"; token: string } | { kind: "oidc" } | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) return { kind: "token", token };
  // Na Vercel o token OIDC chega em cada requisição; fora dela, só se vier no ambiente (vercel env pull).
  if (process.env.BLOB_STORE_ID && (process.env.VERCEL === "1" || process.env.VERCEL_OIDC_TOKEN)) return { kind: "oidc" };
  return null;
}

export function storageMode(): StorageMode {
  if (blobAuth()) return "blob";
  return process.env.VERCEL === "1" ? "off" : "local";
}

export function uploadsAvailable(): boolean {
  return storageMode() !== "off";
}

/** Chave do objeto: nunca inclui o nome original (que pode ter dado pessoal). */
export function storageKey(teacherId: string, purpose: string, fileId: string): string {
  return `${teacherId}/${purpose}/${fileId}`;
}

// ---------------------------------------------------------------- Vercel Blob

export const BLOB_UPLOAD_ROUTE = "/api/uploads/blob";

function blobAdapter(auth: { kind: "token"; token: string } | { kind: "oidc" }): StorageAdapter {
  const sdk = () => import("@vercel/blob");
  // Com OIDC as chamadas vão sem token: o SDK usa BLOB_STORE_ID e o token OIDC da requisição.
  const cred = auth.kind === "token" ? { token: auth.token } : {};
  return {
    mode: "blob",
    async createUpload({ fileId, key, contentType, maxBytes }) {
      const validUntil = Date.now() + UPLOAD_TTL_MS;
      if (auth.kind === "oidc") {
        const clientPayload = await signClaims({ id: fileId, key, ct: contentType, max: maxBytes, exp: validUntil });
        return { kind: "blob-presigned", pathname: key, handleUploadUrl: BLOB_UPLOAD_ROUTE, clientPayload };
      }
      const { generateClientTokenFromReadWriteToken } = await import("@vercel/blob/client");
      const clientToken = await generateClientTokenFromReadWriteToken({
        token: auth.token,
        pathname: key,
        allowedContentTypes: [contentType],
        maximumSizeInBytes: maxBytes,
        validUntil,
        addRandomSuffix: false,
        allowOverwrite: false,
      });
      return { kind: "blob", pathname: key, clientToken };
    },
    async head(key) {
      const { head, BlobNotFoundError } = await sdk();
      try {
        const h = await head(key, cred);
        return { size: h.size, contentType: h.contentType };
      } catch (err) {
        if (err instanceof BlobNotFoundError) return null;
        throw err;
      }
    },
    async downloadUrl(key) {
      const { issueSignedToken, presignUrl } = await sdk();
      const validUntil = Date.now() + DOWNLOAD_TTL_MS;
      const signed = await issueSignedToken({ ...cred, pathname: key, operations: ["get"], validUntil });
      return (await presignUrl(signed, { operation: "get", pathname: key, access: "private", validUntil })).presignedUrl;
    },
    async read() {
      return null;
    },
    async delete(keys) {
      if (!keys.length) return;
      const { del } = await sdk();
      await del(keys, cred);
    },
  };
}

/** Limites da URL pré-assinada a partir da autorização assinada pelo servidor (ou null se não vale). */
export async function presignedUploadLimits(clientPayload: string | null, pathname: string) {
  const c = await verifyUploadClaims(clientPayload ?? "");
  if (!c || c.key !== pathname) return null;
  return { allowedContentTypes: [c.ct], maximumSizeInBytes: c.max, validUntil: c.exp };
}

/**
 * Rota /api/uploads/blob (modo OIDC): emite o token "put" só para a chave,
 * o tipo e o tamanho que o servidor autorizou no pedido de envio.
 */
export async function presignedUploadToken(clientPayload: string | null, pathname: string) {
  const limits = await presignedUploadLimits(clientPayload, pathname);
  if (!limits) throw new Error("Autorização de envio inválida ou vencida.");
  const { issueSignedToken } = await import("@vercel/blob");
  const token = await issueSignedToken({ pathname, operations: ["put"], ...limits });
  return { token, urlOptions: { ...limits, addRandomSuffix: false, allowOverwrite: false } };
}

// ---------------------------------------------------------------- local

// A autorização de envio é assinada com uma chave derivada do segredo da
// sessão, igual em todas as instâncias: na Vercel, a ação que autoriza e a
// rota que recebe o envio podem rodar em instâncias diferentes.
const g = globalThis as unknown as { __tsUploadSecret?: Promise<Buffer> | null };
function uploadSecret(): Promise<Buffer> {
  g.__tsUploadSecret ??= Promise.resolve(process.env.SESSION_SECRET || meta.secret())
    .then((secret) => createHmac("sha256", secret).update("docentia-uploads-v1").digest())
    .catch((err) => {
      g.__tsUploadSecret = null;
      throw err;
    });
  return g.__tsUploadSecret;
}

export function localUploadDir(): string {
  // turbopackIgnore: caminho só do modo local; não deve puxar o projeto para o pacote da função.
  return process.env.UPLOAD_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "uploads");
}

interface UploadClaims {
  id: string;
  key: string;
  ct: string;
  max: number;
  exp: number;
}

async function signClaims(c: UploadClaims): Promise<string> {
  const data = Buffer.from(JSON.stringify(c)).toString("base64url");
  return `${data}.${createHmac("sha256", await uploadSecret()).update(data).digest("base64url")}`;
}

/** Confere uma autorização de envio (assinatura e validade). */
export async function verifyUploadClaims(token: string): Promise<UploadClaims | null> {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = Buffer.from(createHmac("sha256", await uploadSecret()).update(data).digest("base64url"));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const c = JSON.parse(Buffer.from(data, "base64url").toString()) as UploadClaims;
    return c.exp > Date.now() ? c : null;
  } catch {
    return null;
  }
}

/** Confere o token da rota de upload local (assinatura, validade e id). */
export async function verifyLocalUpload(token: string, fileId: string): Promise<UploadClaims | null> {
  const c = await verifyUploadClaims(token);
  return c && c.id === fileId ? c : null;
}

function localPath(key: string): string {
  const dir = path.resolve(/*turbopackIgnore: true*/ localUploadDir());
  const full = path.resolve(/*turbopackIgnore: true*/ dir, ...key.split("/"));
  if (!full.startsWith(dir + path.sep)) throw new Error("Chave de arquivo inválida.");
  return full;
}

/** Grava o corpo enviado à rota local, respeitando o tamanho máximo. Não sobrescreve. */
export async function writeLocalUpload(c: UploadClaims, body: ReadableStream<Uint8Array>): Promise<{ size: number } | { error: string }> {
  const file = localPath(c.key);
  await fsp.mkdir(path.dirname(file), { recursive: true });
  let size = 0;
  const handle = await fsp.open(file, "wx").catch(() => null);
  if (!handle) return { error: "exists" };
  try {
    const reader = body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > c.max) {
        await reader.cancel();
        throw new Error("too_large");
      }
      await handle.write(value);
    }
  } catch (err) {
    await handle.close();
    await fsp.rm(file, { force: true });
    return { error: err instanceof Error && err.message === "too_large" ? "too_large" : "write_failed" };
  }
  await handle.close();
  await fsp.writeFile(`${file}.meta.json`, JSON.stringify({ contentType: c.ct }));
  return { size };
}

function localAdapter(): StorageAdapter {
  return {
    mode: "local",
    async createUpload({ fileId, key, contentType, maxBytes }) {
      const t = await signClaims({ id: fileId, key, ct: contentType, max: maxBytes, exp: Date.now() + UPLOAD_TTL_MS });
      return { kind: "local", url: `/api/uploads/local/${fileId}?t=${encodeURIComponent(t)}` };
    },
    async head(key) {
      const file = localPath(key);
      const st = await fsp.stat(file).catch(() => null);
      if (!st) return null;
      const meta = JSON.parse(await fsp.readFile(`${file}.meta.json`, "utf8").catch(() => "{}")) as { contentType?: string };
      return { size: st.size, contentType: meta.contentType ?? "application/octet-stream" };
    },
    async downloadUrl() {
      return null;
    },
    async read(key) {
      const file = localPath(key);
      if (!fs.existsSync(file)) return null;
      const stream = fs.createReadStream(file);
      return new ReadableStream<Uint8Array>({
        start(controller) {
          stream.on("data", (chunk) => controller.enqueue(typeof chunk === "string" ? Buffer.from(chunk) : new Uint8Array(chunk)));
          stream.on("end", () => controller.close());
          stream.on("error", (e) => controller.error(e));
        },
        cancel() {
          stream.destroy();
        },
      });
    },
    async delete(keys) {
      for (const key of keys) {
        const file = localPath(key);
        await fsp.rm(file, { force: true });
        await fsp.rm(`${file}.meta.json`, { force: true });
      }
    },
  };
}

const offAdapter: StorageAdapter = {
  mode: "off",
  async createUpload() {
    throw new Error(UPLOADS_UNAVAILABLE);
  },
  async head() {
    return null;
  },
  async downloadUrl() {
    return null;
  },
  async read() {
    return null;
  },
  async delete(keys) {
    if (keys.length) console.warn(`[storage] armazenamento não configurado; objetos não apagados: ${keys.join(", ")}`);
  },
};

export function storage(): StorageAdapter {
  const auth = blobAuth();
  if (auth) return blobAdapter(auth);
  return process.env.VERCEL === "1" ? offAdapter : localAdapter();
}

/**
 * Apaga objetos depois que a transação do banco confirmou. Se falhar, não
 * desfaz nada no banco: registra cada chave no log para limpeza manual.
 */
export async function deleteObjectsAfterCommit(keys: string[], context: string): Promise<void> {
  if (!keys.length) return;
  try {
    await storage().delete(keys);
  } catch (err) {
    console.error(
      `[storage] falha ao apagar ${keys.length} objeto(s) (${context}); apague manualmente: ${keys.join(", ")}`,
      err instanceof Error ? err.message : err
    );
  }
}
