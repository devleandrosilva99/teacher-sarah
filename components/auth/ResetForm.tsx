"use client";

import { useActionState } from "react";
import { resetPassword } from "@/server/actions/auth";
import { initialState } from "@/server/actions/state";
import { Button, Field, Input, Notice } from "@/components/ui";

export default function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Nova senha" hint="Mínimo de 8 caracteres">
        <Input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
      </Field>
      <Field label="Repita a nova senha">
        <Input name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
      </Field>
      {state.error && <Notice variant="danger">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
