import { MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { whatsappLink } from "@/lib/whatsapp";

/** Abre o WhatsApp do professor com a mensagem pronta (para o telefone do aluno, se houver). */
export default function WhatsAppButton({
  text,
  phone,
  label = "Enviar pelo WhatsApp",
  small = false,
}: {
  text: string;
  phone?: string;
  label?: string;
  small?: boolean;
}) {
  return (
    <ButtonLink
      href={whatsappLink(text, phone)}
      target="_blank"
      rel="noopener noreferrer"
      variant="secondary"
      className={small ? "px-2 py-1 text-xs" : undefined}
      title={phone ? undefined : "Sem telefone cadastrado: o WhatsApp vai perguntar para quem enviar"}
    >
      <MessageCircle size={small ? 13 : 15} /> {label}
    </ButtonLink>
  );
}
