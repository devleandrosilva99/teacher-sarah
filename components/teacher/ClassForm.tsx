"use client";

import { useActionState, useState } from "react";
import { saveClass } from "@/server/actions/students";
import { initialState } from "@/server/actions/state";
import { Avatar, Button, Card, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { LEVELS, type ClassGroup } from "@/lib/types";

export default function ClassForm({
  group,
  students,
}: {
  group?: ClassGroup;
  students: { id: string; name: string; level: string; avatarColor: number }[];
}) {
  const [state, action, pending] = useActionState(saveClass, initialState);
  const [filter, setFilter] = useState("");
  const selected = new Set(group?.studentIds ?? []);
  return (
    <form action={action} className="flex flex-col gap-4">
      {group && <input type="hidden" name="id" value={group.id} />}
      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nome da turma *" className="sm:col-span-2">
            <Input name="name" required maxLength={80} defaultValue={group?.name} placeholder="Ex.: Conversação B1 · terças" />
          </Field>
          <Field label="Nível">
            <Select name="level" defaultValue={group?.level ?? ""}>
              <option value="">Misto</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Descrição" className="sm:col-span-3">
            <Textarea name="description" maxLength={500} defaultValue={group?.description} className="min-h-16" />
          </Field>
        </div>
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Alunos da turma</h2>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar" className="w-40 rounded-lg border border-line px-2 py-1 text-sm" />
        </div>
        {students.length === 0 ? (
          <p className="text-sm text-ink-3">Cadastre alunos primeiro.</p>
        ) : (
          <div className="grid gap-1 sm:grid-cols-2">
            {students.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-page"
                style={{ display: filter && !s.name.toLowerCase().includes(filter.toLowerCase()) ? "none" : undefined }}
              >
                <input type="checkbox" name="studentIds" value={s.id} defaultChecked={selected.has(s.id)} />
                <Avatar name={s.name} color={s.avatarColor} size={26} />
                <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                <span className="text-xs text-ink-3">{s.level}</span>
              </label>
            ))}
          </div>
        )}
      </Card>
      {state.error && <Notice variant="danger">{state.error}</Notice>}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : group ? "Salvar turma" : "Criar turma"}</Button>
      </div>
    </form>
  );
}
