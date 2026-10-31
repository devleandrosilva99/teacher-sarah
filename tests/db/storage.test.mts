// Armazenamento: escolha do modo pelas variáveis (token fixo ou OIDC do Vercel
// Blob, local, desligado) e a autorização assinada que a rota
// /api/uploads/blob exige para emitir a URL pré-assinada (modo OIDC).
// Nada aqui fala com o Vercel Blob de verdade.
import { after, afterEach, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { SKIP, setupSchema } from "./setup.mts";

const KEYS = ["BLOB_READ_WRITE_TOKEN", "BLOB_STORE_ID", "VERCEL_OIDC_TOKEN", "VERCEL"] as const;

describe("armazenamento", { skip: SKIP }, () => {
  let env: Awaited<ReturnType<typeof setupSchema>>;
  let storage: typeof import("../../server/storage/index.ts");
  const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  const setEnv = (vars: Partial<Record<(typeof KEYS)[number], string>>) => {
    for (const k of KEYS) delete process.env[k];
    Object.assign(process.env, vars);
  };

  before(async () => {
    env = await setupSchema();
    storage = await import("../../server/storage/index.ts");
  });
  afterEach(() => setEnv(Object.fromEntries(Object.entries(saved).filter(([, v]) => v !== undefined)) as Record<string, string>));
  after(async () => env?.cleanup());

  test("modo: token fixo, OIDC (Vercel), local ou desligado", () => {
    setEnv({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_x_y" });
    assert.equal(storage.storageMode(), "blob");
    assert.equal(storage.blobAuth()?.kind, "token");
    setEnv({ BLOB_STORE_ID: "store_abc", VERCEL: "1" });
    assert.equal(storage.storageMode(), "blob", "na Vercel, BLOB_STORE_ID basta (o token OIDC vem na requisição)");
    assert.equal(storage.blobAuth()?.kind, "oidc");
    setEnv({ BLOB_STORE_ID: "store_abc", VERCEL_OIDC_TOKEN: "oidc" });
    assert.equal(storage.blobAuth()?.kind, "oidc", "fora da Vercel, com o token OIDC do vercel env pull");
    setEnv({ BLOB_STORE_ID: "store_abc" });
    assert.equal(storage.storageMode(), "local", "fora da Vercel sem token OIDC: não dá para autenticar");
    setEnv({ BLOB_STORE_ID: "store_abc", BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_x_y", VERCEL: "1" });
    assert.equal(storage.blobAuth()?.kind, "token", "com as duas, o token fixo tem preferência");
    setEnv({ VERCEL: "1" });
    assert.equal(storage.storageMode(), "off");
    assert.equal(storage.uploadsAvailable(), false);
    setEnv({});
    assert.equal(storage.storageMode(), "local");
  });

  test("OIDC: o pedido de envio devolve a autorização para a rota pré-assinada", async () => {
    setEnv({ BLOB_STORE_ID: "store_abc", VERCEL: "1" });
    const key = "t1/submission/f1";
    const ticket = await storage.storage().createUpload({ fileId: "f1", key, contentType: "image/webp", maxBytes: 5000 });
    assert.equal(ticket.kind, "blob-presigned");
    if (ticket.kind !== "blob-presigned") return;
    assert.equal(ticket.pathname, key);
    assert.equal(ticket.handleUploadUrl, storage.BLOB_UPLOAD_ROUTE);

    const limits = await storage.presignedUploadLimits(ticket.clientPayload, key);
    assert.ok(limits);
    assert.deepEqual(limits.allowedContentTypes, ["image/webp"]);
    assert.equal(limits.maximumSizeInBytes, 5000);
    assert.ok(limits.validUntil > Date.now() && limits.validUntil <= Date.now() + 10 * 60_000);

    // Outra chave, autorização alterada ou ausente: recusado.
    assert.equal(await storage.presignedUploadLimits(ticket.clientPayload, "t1/submission/outro"), null);
    const [data, sig] = ticket.clientPayload.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(data, "base64url").toString()), max: 10 ** 9 })).toString("base64url");
    assert.equal(await storage.presignedUploadLimits(`${forged}.${sig}`, key), null, "aumentar o tamanho quebra a assinatura");
    assert.equal(await storage.presignedUploadLimits(null, key), null);
    assert.equal(await storage.presignedUploadLimits("x.y", key), null);
    await assert.rejects(storage.presignedUploadToken("x.y", key), /inválida ou vencida/);
  });

  test("autorização vencida ou de outro arquivo é recusada", async () => {
    setEnv({});
    const ticket = await storage.storage().createUpload({ fileId: "f2", key: "t1/submission/f2", contentType: "application/pdf", maxBytes: 10 });
    assert.equal(ticket.kind, "local");
    if (ticket.kind !== "local") return;
    const t = new URL(`http://x${ticket.url}`).searchParams.get("t")!;
    assert.ok(await storage.verifyLocalUpload(t, "f2"));
    assert.equal(await storage.verifyLocalUpload(t, "f3"), null, "autorização de outro arquivo");
    const realNow = Date.now;
    try {
      Date.now = () => realNow() + 11 * 60_000;
      assert.equal(await storage.verifyUploadClaims(t), null, "vencida depois de 10 minutos");
    } finally {
      Date.now = realNow;
    }
  });
});
