"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/server/actions/auth";
import { initialState } from "@/server/actions/state";
import { Button, Field, Input, Notice } from "@/components/ui";

export default function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  if (state.ok) return <Notice variant="success">{state.ok}</Notice>;
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="E-mail da sua conta">
        <Input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={state.fields?.email} />
      </Field>
      {state.error && <Notice variant="danger">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link"}
      </Button>
    </form>
  );
}
