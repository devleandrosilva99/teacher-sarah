"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login } from "@/server/actions/auth";
import { initialState } from "@/server/actions/state";
import { Button, Field, Input, Notice } from "@/components/ui";

export default function LoginForm({ next = "" }: { next?: string }) {
  const [state, action, pending] = useActionState(login, initialState);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={state.fields?.email} />
      </Field>
      <Field label="Senha">
        <div className="relative">
          <Input name="password" type={show ? "text" : "password"} autoComplete="current-password" required maxLength={128} className="pr-10" />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-2 flex items-center text-ink-3 hover:text-ink"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>
      {state.error && <Notice variant="danger">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
