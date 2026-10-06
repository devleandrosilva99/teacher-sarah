"use client";

import { useActionState } from "react";
import { assignActivity } from "@/server/actions/activities";
import { initialState } from "@/server/actions/state";
import { Button, Field, Input, Notice } from "@/components/ui";

export default function AssignForm({
  activityId,
  classes,
  students,
  preselected = "",
}: {
  activityId: string;
  classes: { id: string; name: string; count: number }[];
  students: { id: string; name: string; level: string }[];
  preselected?: string;
}) {
  const [state, action, pending] = useActionState(assignActivity, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="activityId" value={activityId} />
      {classes.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-medium text-ink-2">Turmas</div>
          <div className="grid gap-1 sm:grid-cols-2">
            {classes.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-page">
                <input type="checkbox" name="targets" value={`turma:${c.id}`} defaultChecked={preselected === `turma:${c.id}`} />
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-ink-3">{c.count} alunos</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="mb-1.5 text-xs font-medium text-ink-2">Alunos</div>
        {students.length === 0 ? (
          <p className="text-sm text-ink-3">Nenhum aluno ativo.</p>
        ) : (
          <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
            {students.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-page">
                <input type="checkbox" name="targets" value={`aluno:${s.id}`} defaultChecked={preselected === `aluno:${s.id}`} />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="text-xs text-ink-3">{s.level}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Liberar em" hint="Vazio = agora">
          <Input type="datetime-local" name="releaseAt" />
        </Field>
        <Field label="Prazo" hint="Vazio = sem prazo. Entregas depois do prazo ficam marcadas como atrasadas.">
          <Input type="datetime-local" name="dueAt" />
        </Field>
      </div>
      {state.error && <Notice variant="danger">{state.error}</Notice>}
      {state.ok && <Notice variant="success">{state.ok}</Notice>}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Enviando..." : "Enviar atividade"}</Button>
      </div>
    </form>
  );
}
