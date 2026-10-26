"use client";

import { useActionState } from "react";
import { acceptInvite } from "@/server/actions/auth";
import { initialState } from "@/server/actions/state";
import { Button, Field, Input, Notice } from "@/components/ui";

export default function InviteForm({ token, minor }: { token: string; minor: boolean }) {
  const [state, action, pending] = useActionState(acceptInvite, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Crie uma senha" hint="Mínimo de 8 caracteres">
        <Input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
      </Field>
      <Field label="Repita a senha">
        <Input name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
      </Field>
      <label className="flex items-start gap-2 text-sm text-ink-2">
        <input type="checkbox" name="terms" className="mt-1" required />
        <span>
          Li e aceito os <a href="/termos" target="_blank" className="text-brand underline">termos de uso</a> e a{" "}
          <a href="/privacidade" target="_blank" className="text-brand underline">política de privacidade</a>.
        </span>
      </label>
      {minor && (
        <label className="flex items-start gap-2 text-sm text-ink-2">
          <input type="checkbox" name="guardian" className="mt-1" required />
          <span>Sou menor de 18 anos e meu responsável legal autoriza o uso da plataforma e o tratamento dos meus dados.</span>
        </label>
      )}
      {state.error && <Notice variant="danger">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? "Ativando..." : "Ativar conta"}
      </Button>
    </form>
  );
}
