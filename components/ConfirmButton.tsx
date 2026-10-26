"use client";

import type { ComponentProps } from "react";
import { Button } from "./ui";

/** Botão de envio que pede confirmação antes de submeter o formulário. */
export default function ConfirmButton({
  message,
  ...props
}: ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}
