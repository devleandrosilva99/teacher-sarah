"use client";

import { useActionState, useState } from "react";
import { saveTeacherSettings } from "@/server/actions/account";
import { initialState } from "@/server/actions/state";
import { Button, Field, Input, Notice, Textarea } from "@/components/ui";
import type { Teacher } from "@/lib/types";

const PRESETS = ["#378ADD", "#1D9E75", "#534AB7", "#D85A30", "#C2417A", "#1A1A1A"];

export default function SettingsForm({ teacher, base }: { teacher: Teacher; base: string }) {
  const [state, action, pending] = useActionState(saveTeacherSettings, initialState);
  const [color, setColor] = useState(teacher.color);
  const [slug, setSlug] = useState(teacher.slug);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Nome exibido">
        <Input name="name" defaultValue={teacher.name} maxLength={80} required />
      </Field>
      <Field label="Endereço da sua página" hint={`${base}/p/${slug}`}>
        <Input name="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={40} required />
      </Field>
      <Field label="Apresentação (aparece na sua página)">
        <Textarea name="bio" defaultValue={teacher.bio} maxLength={300} className="min-h-16" />
      </Field>
      <Field label="Cor da sua marca">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="h-8 w-8 rounded-full border-2"
              style={{ backgroundColor: c, borderColor: color.toLowerCase() === c.toLowerCase() ? "#1a1a1a" : "transparent" }}
              aria-label={`Cor ${c}`}
            />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-line" aria-label="Outra cor" />
          <input type="hidden" name="color" value={color} />
        </div>
      </Field>
      {state.error && <Notice variant="danger">{state.error}</Notice>}
      {state.ok && <Notice variant="success">{state.ok}</Notice>}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>
      </div>
    </form>
  );
}
