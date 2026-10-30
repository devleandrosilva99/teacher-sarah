"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { confirmMediaUpload, requestMediaUpload } from "@/server/actions/files";
import { uploadFile } from "@/lib/upload-client";

/** "Enviar arquivo" ao lado do campo de link da mídia (imagem ou áudio da questão/texto). */
export default function MediaUploadButton({ accept, onUploaded }: { accept: string; onUploaded: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pick(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    setError("");
    const res = await uploadFile(f, requestMediaUpload, confirmMediaUpload);
    setBusy(false);
    if (input.current) input.current.value = "";
    if ("error" in res) setError(res.error);
    else onUploaded(res.url);
  }
  return (
    <span className="inline-flex flex-col gap-1">
      <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:bg-surface-raised disabled:opacity-60"
      >
        <Upload size={15} /> {busy ? "Enviando..." : "Enviar arquivo"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
