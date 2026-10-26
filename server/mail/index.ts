import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { APP_NAME } from "@/lib/brand";

// Envio de e-mail. Três modos, escolhidos pelas variáveis de ambiente:
//   * smtp:   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e MAIL_FROM definidos
//             (Gmail com senha de app, ou qualquer serviço transacional);
//   * outbox: desenvolvimento local sem SMTP. Cada e-mail vira um arquivo em
//             .data/outbox/ (fora do Git) e aparece em /dev/emails;
//   * off:    na Vercel sem SMTP (o disco lá é somente leitura). Nada é enviado;
//             o log registra destinatário e assunto, sem o corpo (que traz o
//             link de uso único), e as telas mostram uma mensagem amigável.

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type MailMode = "smtp" | "outbox" | "off";

export interface Mailer {
  mode: MailMode;
  send(message: MailMessage): Promise<void>;
}

export const OUTBOX_DIR = path.join(process.cwd(), ".data", "outbox");

function smtpConfig() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) return null;
  return { host: SMTP_HOST, port: Number(SMTP_PORT), user: SMTP_USER, pass: SMTP_PASS, from: MAIL_FROM };
}

export function mailMode(): MailMode {
  if (smtpConfig()) return "smtp";
  return process.env.VERCEL === "1" ? "off" : "outbox";
}

/** false quando não há como entregar o e-mail (Vercel sem SMTP). */
export function mailAvailable(): boolean {
  return mailMode() !== "off";
}

export const MAIL_UNAVAILABLE = "O envio de e-mails ainda não está configurado. Fale com o suporte.";

function smtpMailer(cfg: NonNullable<ReturnType<typeof smtpConfig>>): Mailer {
  let transport: Promise<import("nodemailer").Transporter> | null = null;
  return {
    mode: "smtp",
    async send(m) {
      transport ??= import("nodemailer").then((nm) =>
        nm.createTransport({
          host: cfg.host,
          port: cfg.port,
          secure: cfg.port === 465,
          auth: { user: cfg.user, pass: cfg.pass },
        })
      );
      await (await transport).sendMail({
        from: cfg.from.includes("<") ? cfg.from : `${APP_NAME} <${cfg.from}>`,
        to: m.to,
        subject: m.subject,
        text: m.text,
        html: m.html,
      });
    },
  };
}

/** Caixa de saída em arquivo (só desenvolvimento local). */
export function outboxMailer(dir = OUTBOX_DIR): Mailer {
  return {
    mode: "outbox",
    async send(m) {
      await fs.mkdir(dir, { recursive: true });
      const slug = m.subject.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40);
      const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${slug}.json`);
      await fs.writeFile(file, JSON.stringify({ ...m, sentAt: new Date().toISOString() }, null, 2));
      console.log(`[mail] (desenvolvimento) "${m.subject}" para ${m.to} gravado em ${path.relative(process.cwd(), file)}`);
    },
  };
}

const offMailer: Mailer = {
  mode: "off",
  async send(m) {
    console.warn(
      `[mail] AVISO: SMTP não configurado (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM). ` +
        `E-mail NÃO enviado: "${m.subject}" para ${m.to}. O corpo não é registrado porque contém um link de uso único.`
    );
  },
};

let override: Mailer | null = null;

/** Usado pelos testes: troca o adaptador (null volta ao normal). */
export function setMailerForTests(m: Mailer | null) {
  override = m;
}

export function mailer(): Mailer {
  if (override) return override;
  const cfg = smtpConfig();
  if (cfg) return smtpMailer(cfg);
  return process.env.VERCEL === "1" ? offMailer : outboxMailer();
}

/** Envia sem deixar a falha derrubar quem chamou (o erro vai para o log). */
export async function sendMail(m: MailMessage): Promise<boolean> {
  try {
    await mailer().send(m);
    return true;
  } catch (err) {
    console.error(`[mail] falha ao enviar "${m.subject}" para ${m.to}:`, err instanceof Error ? err.message : err);
    return false;
  }
}
