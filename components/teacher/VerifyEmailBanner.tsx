"use client";

import { useActionState } from "react";
import { resendVerification } from "@/server/actions/auth";
import { initialState } from "@/server/actions/state";

/** Aviso do professor que ainda não confirmou o e-mail, com o botão de reenvio. */
export default function VerifyEmailBanner({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendVerification, initialState);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn-fg">
      <span className="flex-1">
        {state.ok ?? state.error ?? `Confirme seu e-mail (${email}) pelo link que enviamos. Assim você recebe avisos e pode recuperar a senha.`}
      </span>
      {!state.ok && (
        <form action={action}>
          <button type="submit" disabled={pending} className="rounded-lg border border-current px-3 py-1 text-xs font-medium hover:opacity-80">
            {pending ? "Enviando..." : "Reenviar"}
          </button>
        </form>
      )}
    </div>
  );
}
