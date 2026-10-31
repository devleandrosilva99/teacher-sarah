"use client";

import { useRef, useState } from "react";
import { FileText, Paperclip, Trash2 } from "lucide-react";
import { confirmSubmissionUpload, removeSubmissionUpload, requestSubmissionUpload } from "@/server/actions/files";
import { uploadFile } from "@/lib/upload-client";
import { FILE_KIND_LABELS, formatBytes, typesFor } from "@/lib/files";
import type { Contents } from "@/lib/question-types";

export type FileInfo = { name: string; size: number };

/**
 * Resposta de "Entrega de arquivo": lista os arquivos e, com a tentativa
 * aberta, permite anexar e retirar. Na revisão, só os links de download.
 */
export default function FileAnswer({
  questionId,
  content,
  fileIds,
  files,
  submissionId,
  onChange,
}: {
  questionId: string;
  content: Contents["file_upload"];
  fileIds: string[];
  files?: Record<string, FileInfo>;
  /** Presente só durante a tentativa: habilita anexar e retirar. */
  submissionId?: string;
  onChange?: (ids: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [known, setKnown] = useState<Record<string, FileInfo>>(files ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editable = !!submissionId && !!onChange;

  async function pick(list: FileList | null) {
    if (!list?.length || !submissionId || !onChange) return;
    setBusy(true);
    setError("");
    let ids = [...fileIds];
    for (const f of Array.from(list).slice(0, content.maxFiles - ids.length)) {
      const res = await uploadFile(
        f,
        (name, contentType, size) => requestSubmissionUpload({ name, contentType, size, submissionId, questionId }),
        confirmSubmissionUpload
      );
      if ("error" in res) {
        setError(`${f.name}: ${res.error}`);
        continue;
      }
      setKnown((k) => ({ ...k, [res.file.id]: { name: res.file.name, size: res.file.size } }));
      ids = [...ids, res.file.id];
      onChange(ids);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  async function remove(id: string) {
    if (!onChange) return;
    const res = await removeSubmissionUpload(id);
    if ("error" in res) setError(res.error);
    else onChange(fileIds.filter((x) => x !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      {content.rubric && <p className="text-xs text-ink-3">Critérios: {content.rubric}</p>}
      <p className="text-xs text-ink-3">
        Aceita: {content.accept.map((k) => FILE_KIND_LABELS[k]).join(", ")} · até {content.maxFiles} arquivo(s) de {content.maxMB} MB
      </p>
      {fileIds.length === 0 && !editable && <p className="text-sm text-ink-3">Nenhum arquivo enviado.</p>}
      <ul className="flex flex-col gap-1.5">
        {fileIds.map((id) => (
          <li key={id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
            <FileText size={15} className="shrink-0 text-ink-3" />
            <a href={`/arquivos/${id}`} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate text-brand hover:underline">
              {known[id]?.name ?? "Arquivo"}
            </a>
            {known[id] && <span className="text-xs text-ink-3">{formatBytes(known[id].size)}</span>}
            {editable && (
              <button type="button" onClick={() => remove(id)} className="rounded p-1 text-ink-3 hover:text-danger" aria-label="Retirar arquivo">
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {editable && fileIds.length < content.maxFiles && (
        <div>
          <input
            ref={input}
            type="file"
            multiple={content.maxFiles - fileIds.length > 1}
            accept={typesFor(content.accept).join(",")}
            className="hidden"
            onChange={(e) => pick(e.target.files)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-sm hover:border-brand disabled:opacity-60"
          >
            <Paperclip size={15} /> {busy ? "Enviando..." : "Anexar arquivo"}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
