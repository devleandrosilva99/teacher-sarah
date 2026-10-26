"use client";

import { useActionState } from "react";
import { updateStudentContact } from "@/server/actions/account";
import { initialState } from "@/server/actions/state";
import { Button, Field, Input, Notice } from "@/components/ui";

export default function ContactForm({ phone }: { phone: string }) {
  const [state, action, pending] = useActionState(updateStudentContact, initialState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Telefone">
        <Input name="phone" defaultValue={phone} maxLength={30} />
      </Field>
      {state.ok && <Notice variant="success">{state.ok}</Notice>}
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>Salvar</Button>
      </div>
    </form>
  );
}
