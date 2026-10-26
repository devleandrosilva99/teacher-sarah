"use client";

import { useActionState } from "react";
import { signupTeacher } from "@/server/actions/auth";
import { initialState } from "@/server/actions/state";
import { Button, Field, Input, Notice } from "@/components/ui";

export default function SignupForm() {
  const [state, action, pending] = useActionState(signupTeacher, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Seu nome">
        <Input name="name" required maxLength={80} autoComplete="name" defaultValue={state.fields?.name} />
      </Field>
      <Field label="E-mail">
        <Input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={state.fields?.email} />
      </Field>
      <Field label="Senha" hint="Mínimo de 8 caracteres">
        <Input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
      </Field>
      <label className="flex items-start gap-2 text-sm text-ink-2">
        <input type="checkbox" name="terms" className="mt-1" required />
        <span>
          Li e aceito os <a href="/termos" target="_blank" className="text-brand underline">termos de uso</a> e a{" "}
          <a href="/privacidade" target="_blank" className="text-brand underline">política de privacidade</a>.
        </span>
      </label>
      {state.error && <Notice variant="danger">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
