"use client";

import { useActionState } from "react";
import { changePassword } from "@/server/actions/auth";
import { initialState } from "@/server/actions/state";
import { Button, Field, Input, Notice } from "@/components/ui";

export default function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Senha atual">
        <Input name="current" type="password" required autoComplete="current-password" maxLength={128} />
      </Field>
      <Field label="Nova senha" hint="Mínimo de 8 caracteres">
        <Input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
      </Field>
      <Field label="Repita a nova senha">
        <Input name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
      </Field>
      {state.error && <Notice variant="danger">{state.error}</Notice>}
      {state.ok && <Notice variant="success">{state.ok}</Notice>}
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Alterando..." : "Alterar senha"}</Button>
      </div>
    </form>
  );
}
