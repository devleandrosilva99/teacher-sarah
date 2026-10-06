import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/brand";
import { initials } from "@/lib/format";

export default function AuthShell({
  title,
  subtitle,
  brand,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  brand?: { name: string; color: string };
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10"
      style={brand ? ({ ["--brand" as string]: brand.color } as React.CSSProperties) : undefined}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-base font-semibold text-brand-ink"
          >
            {brand ? initials(brand.name) : "TS"}
          </Link>
          <h1 className="text-xl font-medium">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">{children}</div>
        {footer && <div className="mt-4 text-center text-sm text-ink-2">{footer}</div>}
        <p className="mt-8 text-center text-xs text-ink-3">{APP_NAME}</p>
      </div>
    </div>
  );
}
