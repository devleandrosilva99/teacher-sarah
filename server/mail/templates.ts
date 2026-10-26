import "server-only";
import { APP_NAME } from "@/lib/brand";
import type { MailMessage } from "./index";

// Modelos dos e-mails, em texto e HTML simples. Os links chegam prontos
// (montados com baseUrl()); nomes vindos do banco são escapados no HTML.

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, paragraphs: string[], action: { label: string; href: string }, footer: string): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
<div style="max-width:520px;margin:0 auto;padding:24px">
<div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:24px">
<h1 style="margin:0 0 16px;font-size:20px">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${p}</p>`).join("\n")}
<p style="margin:20px 0"><a href="${esc(action.href)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:15px">${esc(action.label)}</a></p>
<p style="margin:0;font-size:13px;color:#57534e;word-break:break-all">Se o botão não funcionar, copie este endereço no navegador:<br>${esc(action.href)}</p>
</div>
<p style="margin:16px 0 0;font-size:12px;color:#78716c">${esc(footer)}</p>
</div></body></html>`;
}

const FOOTER = `${APP_NAME} · Se você não esperava este e-mail, pode ignorá-lo.`;

export function passwordResetEmail(to: string, name: string, link: string, byAdmin = false): MailMessage {
  const first = name.split(" ")[0] || name;
  const intro = byAdmin
    ? "O suporte enviou um link para você criar uma nova senha."
    : "Recebemos um pedido para redefinir a sua senha.";
  return {
    to,
    subject: `${APP_NAME}: redefinir senha`,
    text: `Olá, ${first}!\n\n${intro} O link vale por 1 hora e só pode ser usado uma vez:\n\n${link}\n\nSe não foi você, ignore este e-mail: sua senha continua a mesma.\n\n${APP_NAME}`,
    html: layout(
      "Redefinir senha",
      [`Olá, ${esc(first)}!`, `${esc(intro)} O link vale por 1 hora e só pode ser usado uma vez.`, "Se não foi você, ignore este e-mail: sua senha continua a mesma."],
      { label: "Criar nova senha", href: link },
      FOOTER
    ),
  };
}

export function verifyEmail(to: string, name: string, link: string): MailMessage {
  const first = name.split(" ")[0] || name;
  return {
    to,
    subject: `${APP_NAME}: confirme seu e-mail`,
    text: `Olá, ${first}!\n\nConfirme o seu e-mail para receber avisos e poder recuperar a senha. O link vale por 24 horas:\n\n${link}\n\n${APP_NAME}`,
    html: layout(
      "Confirme seu e-mail",
      [`Olá, ${esc(first)}!`, "Confirme o seu e-mail para receber avisos e poder recuperar a senha. O link vale por 24 horas."],
      { label: "Confirmar e-mail", href: link },
      FOOTER
    ),
  };
}

export function inviteEmail(to: string, studentName: string, teacherName: string, link: string, expiresAt: string): MailMessage {
  const first = studentName.split(" ")[0] || studentName;
  const until = new Date(expiresAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return {
    to,
    subject: `${teacherName} convidou você para o ${APP_NAME}`,
    text: `Olá, ${first}!\n\n${teacherName} criou o seu acesso ao ${APP_NAME}, onde ficam suas atividades e aulas. Crie sua senha pelo link (válido até ${until}):\n\n${link}\n\n${APP_NAME}`,
    html: layout(
      "Seu acesso está pronto",
      [`Olá, ${esc(first)}!`, `${esc(teacherName)} criou o seu acesso ao ${APP_NAME}, onde ficam suas atividades e aulas.`, `Crie sua senha pelo link (válido até ${esc(until)}).`],
      { label: "Criar minha senha", href: link },
      FOOTER
    ),
  };
}
