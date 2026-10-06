// Datas são guardadas em ISO (UTC) e exibidas no fuso de Brasília.
export const TIME_ZONE = "America/Sao_Paulo";
const OFFSET = "-03:00";

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: TIME_ZONE });
}

export function formatDateTime(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatWeekdayTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ISO → valor de <input type="datetime-local"> no fuso de Brasília. */
export function toInputDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 3 * 3600_000);
  return d.toISOString().slice(0, 16);
}

/** Valor de <input type="datetime-local"> (Brasília) → ISO. */
export function fromInputDateTime(value: string): string {
  if (!value) return "";
  const d = new Date(`${value}:00${OFFSET}`);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function percent(score: number, max: number): number {
  return max > 0 ? Math.round((score / max) * 100) : 0;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
