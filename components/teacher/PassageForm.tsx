"use client";

import { useActionState, useState } from "react";
import { savePassage } from "@/server/actions/questions";
import { initialState } from "@/server/actions/state";
import { Button, Card, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import type { Passage, Subject } from "@/lib/types";
import SubjectPicker from "./SubjectPicker";

export default function PassageForm({ passage, subjects }: { passage?: Passage; subjects: Subject[] }) {
  const [state, action, pending] = useActionState(savePassage, initialState);
  const [subjectId, setSubjectId] = useState(state.fields?.subjectId ?? passage?.subjectId ?? subjects[0]?.id ?? "");
  const subject = subjects.find((x) => x.id === subjectId);
  const [kind, setKind] = useState(passage?.kind ?? "reading");
  const v = (k: keyof Passage) => state.fields?.[k] ?? (passage ? String(passage[k] ?? "") : "");
  // key: remonta o formulário após um erro, para os <select> voltarem ao valor enviado.
  return (
    <form key={JSON.stringify(state.fields ?? {})} action={action} className="flex flex-col gap-4">
      {passage && <input type="hidden" name="id" value={passage.id} />}
      <Card>
        <div className="grid gap-3 sm:grid-cols-4">
          {subjects.length > 1 ? (
            <div className="sm:col-span-4">
              <SubjectPicker subjects={subjects} value={subjectId} onChange={setSubjectId} />
            </div>
          ) : (
            <SubjectPicker subjects={subjects} value={subjectId} />
          )}
          <Field label="Título *" className="sm:col-span-2">
            <Input name="title" required maxLength={150} defaultValue={v("title")} />
          </Field>
          <Field label="Tipo">
            <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value as Passage["kind"])}>
              <option value="reading">Leitura (texto)</option>
              <option value="listening">Compreensão auditiva (áudio)</option>
            </Select>
          </Field>
          <Field label="Nível">
            <Select key={subjectId} name="level" defaultValue={v("level")}>
              <option value="">—</option>
              {(subject?.levels ?? []).map((l) => <option key={l.code} value={l.code}>{l.code}</option>)}
            </Select>
          </Field>
          {kind === "listening" && (
            <Field label="Link do áudio *" hint="Link https de um arquivo .mp3" className="sm:col-span-4">
              <Input name="audioUrl" maxLength={500} defaultValue={v("audioUrl")} placeholder="https://..." />
            </Field>
          )}
          <Field label={kind === "reading" ? "Texto *" : "Transcrição (opcional, o aluno não vê)"} className="sm:col-span-4">
            <Textarea name="text" maxLength={20000} defaultValue={v("text")} className="min-h-64 leading-relaxed" />
          </Field>
          {kind === "reading" && <input type="hidden" name="audioUrl" value="" />}
          <Field label="Fonte / crédito" className="sm:col-span-4">
            <Input name="source" maxLength={200} defaultValue={v("source")} placeholder="Ex.: adaptado de BBC Learning English" />
          </Field>
        </div>
      </Card>
      {state.error && <Notice variant="danger">{state.error}</Notice>}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : passage ? "Salvar texto" : "Criar e adicionar questões"}</Button>
      </div>
    </form>
  );
}
