import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { initials } from "@/lib/format";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cx("min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-5", className)}>{children}</div>;
}

type BadgeVariant = "success" | "warning" | "danger" | "info" | "purple" | "neutral";
const badgeStyles: Record<BadgeVariant, string> = {
  success: "bg-success-bg text-success-fg",
  warning: "bg-warn-bg text-warn-fg",
  danger: "bg-danger-bg text-danger",
  info: "bg-sky-bg text-sky-fg",
  purple: "bg-violet-bg text-violet-fg",
  neutral: "bg-surface-raised text-ink-2",
};

export function Badge({ variant = "neutral", children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium", badgeStyles[variant])}>
      {children}
    </span>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:opacity-90",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-raised",
  ghost: "text-ink-2 hover:bg-surface-raised hover:text-ink",
  danger: "border border-danger/30 bg-surface text-danger hover:bg-danger-bg",
};
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={cx(buttonBase, buttonStyles[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cx(buttonBase, buttonStyles[variant], className)} {...props} />;
}

const control =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={cx(control, className)} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={cx(control, "pr-8", className)} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(control, "min-h-24", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-ink-3">{hint}</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-xs text-ink-2 hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-xl font-medium text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface/60 px-4 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-2">{children}</div>}
    </div>
  );
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 70 ? "bg-success" : v >= 50 ? "bg-warn" : "bg-danger";
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-surface-raised", className)}>
      <div className={cx("h-full rounded-full", color)} style={{ width: `${v}%` }} />
    </div>
  );
}

const AVATAR = [
  "bg-sky-bg text-sky-fg",
  "bg-success-bg text-success-fg",
  "bg-coral-bg text-coral-fg",
  "bg-rose-bg text-rose-fg",
  "bg-violet-bg text-violet-fg",
];

export function Avatar({ name, color = 0, size = 36 }: { name: string; color?: number; size?: number }) {
  return (
    <span
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-medium", AVATAR[color % AVATAR.length])}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-raised px-4 py-3">
      <div className="text-xs text-ink-2">{label}</div>
      <div className="mt-0.5 text-2xl font-medium text-ink">{value}</div>
      {hint && <div className="text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

export function Notice({ variant = "info", children }: { variant?: "info" | "warning" | "danger" | "success"; children: ReactNode }) {
  const s = {
    info: "bg-sky-bg text-sky-fg",
    warning: "bg-warn-bg text-warn-fg",
    danger: "bg-danger-bg text-danger",
    success: "bg-success-bg text-success-fg",
  }[variant];
  return <div className={cx("rounded-lg px-3 py-2 text-sm", s)}>{children}</div>;
}

export function scoreVariant(pct: number | null): BadgeVariant {
  if (pct === null) return "neutral";
  return pct >= 70 ? "success" : pct >= 50 ? "warning" : "danger";
}
