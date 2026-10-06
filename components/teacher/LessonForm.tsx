"use client";

import { useActionState } from "react";
import { createLesson } from "@/server/actions/lessons";
import { initialState } from "@/server/actions/state";
import { Button, Field, Input, Notice, Select } from "@/components/ui";

export default function LessonForm({
  students,
  classes,
  preselected = "",
}: {
  students: { id: string; name: string }[];
  classes: { id: string; name: string }[];
  preselected?: string;
}) {
  const [state, action, pending] = useActionState(createLesson, initialState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-6">
      <Field label="Aluno ou turma *" className="sm:col-span-3">
        <Select name="target" defaultValue={preselected} required>
          <option value="">Escolha...</option>
          {classes.length > 0 && (
            <optgroup label="Turmas">
              {classes.map((c) => <option key={c.id} value={`turma:${c.id}`}>{c.name}</option>)}
            </optgroup>
          )}
          <optgroup label="Alunos">
            {students.map((s) => <option key={s.id} value={`aluno:${s.id}`}>{s.name}</option>)}
          </optgroup>
        </Select>
      </Field>
      <Field label="Data e hora *" className="sm:col-span-2">
        <Input type="datetime-local" name="startsAt" required />
      </Field>
      <Field label="Duração (min)">
        <Input type="number" name="durationMin" defaultValue={60} min={15} max={480} step={5} />
      </Field>
      <Field label="Tema" className="sm:col-span-3">
        <Input name="topic" maxLength={200} placeholder="Ex.: Past simple" />
      </Field>
      <Field label="Link da videochamada" className="sm:col-span-2">
        <Input name="meetingUrl" maxLength={500} placeholder="https://meet.google.com/..." />
      </Field>
      <Field label="Repetir semanalmente" hint="Nº de aulas">
        <Input type="number" name="repeat" defaultValue={1} min={1} max={52} />
      </Field>
      <div className="flex flex-col gap-2 sm:col-span-6">
        {state.error && <Notice variant="danger">{state.error}</Notice>}
        {state.ok && <Notice variant="success">{state.ok}</Notice>}
        <div>
          <Button type="submit" disabled={pending}>{pending ? "Agendando..." : "Agendar"}</Button>
        </div>
      </div>
    </form>
  );
}
