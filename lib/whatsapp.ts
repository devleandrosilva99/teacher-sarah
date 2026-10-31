// Links "Enviar pelo WhatsApp" (wa.me) com o texto já preenchido. O professor
// envia pelo próprio WhatsApp; nada passa pelo servidor.

/**
 * Telefone no formato do wa.me: só dígitos, com DDI. Números brasileiros com
 * DDD (10 ou 11 dígitos, sem o 55) ganham o 55; quem começa com "+" ou "00"
 * já traz o DDI. Zeros à esquerda (0xx) saem. Devolve "" quando não dá para usar.
 */
export function normalizePhone(raw: string | undefined | null): string {
  const text = (raw ?? "").trim();
  const international = text.startsWith("+") || text.startsWith("00");
  let d = text.replace(/\D/g, "").replace(/^0+/, "");
  if (!international && (d.length === 10 || d.length === 11)) d = `55${d}`;
  return d.length >= 12 && d.length <= 15 ? d : "";
}

/** Link do wa.me; sem telefone válido, o WhatsApp pergunta para quem enviar. */
export function whatsappLink(text: string, phone?: string | null): string {
  const p = normalizePhone(phone);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

const brDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function inviteMessage(studentName: string, teacherName: string, link: string, expiresAt: string): string {
  const until = new Date(expiresAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return `Olá, ${firstName(studentName)}! Aqui é ${teacherName}. Criei seu acesso à plataforma das nossas aulas. Crie sua senha por este link (vale até ${until}): ${link}`;
}

export function assignmentMessage(studentName: string, title: string, link: string, dueAt: string): string {
  const due = dueAt ? ` Prazo: ${brDateTime(dueAt)}.` : "";
  return `Olá, ${firstName(studentName)}! Você tem uma atividade na plataforma: "${title}".${due} Acesse: ${link}`;
}
