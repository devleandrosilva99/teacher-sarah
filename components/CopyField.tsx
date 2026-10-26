"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={value} className="w-full min-w-0 rounded-lg border border-line bg-page px-3 py-2 text-xs text-ink-2" onFocus={(e) => e.target.select()} />
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium hover:bg-surface-raised"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
