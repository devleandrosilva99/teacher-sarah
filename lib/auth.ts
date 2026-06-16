export type Role = "aluno" | "professora";

export interface Credential {
  email: string;
  password: string;
  role: Role;
  userId: string;
}

export interface Session {
  email: string;
  role: Role;
  userId: string;
}

export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_MIN_LENGTH = 6;

export const DEMO_CREDENTIALS: Credential[] = [
  { email: "sarah@teachersarah.com", password: "sarah123", role: "professora", userId: "sarah" },
  { email: "lucas.mendes@email.com", password: "demo123", role: "aluno", userId: "lucas" },
  { email: "julia.santos@email.com", password: "demo123", role: "aluno", userId: "julia" },
  { email: "rafael.almeida@email.com", password: "demo123", role: "aluno", userId: "rafael" },
  { email: "marina.costa@email.com", password: "demo123", role: "aluno", userId: "marina" },
  { email: "pedro.vasconcelos@email.com", password: "demo123", role: "aluno", userId: "pedro" },
];

const CREDENTIALS_KEY = "credentials_extra";
const SESSION_KEY = "session";

export function loadExtraCredentials(): Credential[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    return raw ? (JSON.parse(raw) as Credential[]) : [];
  } catch {
    return [];
  }
}

export function saveExtraCredential(cred: Credential): void {
  const existing = loadExtraCredentials();
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify([...existing, cred]));
}

export function emailExists(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const all = [...DEMO_CREDENTIALS, ...loadExtraCredentials()];
  return all.some((c) => c.email.toLowerCase() === normalized);
}

export function authenticate(email: string, password: string): Session | null {
  const normalized = email.trim().toLowerCase();
  const all = [...DEMO_CREDENTIALS, ...loadExtraCredentials()];
  const match = all.find(
    (c) => c.email.toLowerCase() === normalized && c.password === password
  );
  if (!match) return null;
  return { email: match.email, role: match.role, userId: match.userId };
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
