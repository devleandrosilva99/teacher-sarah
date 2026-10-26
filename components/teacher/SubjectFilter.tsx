import Link from "next/link";
import { cx } from "@/components/ui";
import type { Subject } from "@/lib/types";

/** Abas de disciplina para as listas. Some quando há uma disciplina só. */
export default function SubjectFilter({
  subjects,
  current,
  basePath,
  params = {},
}: {
  subjects: Pick<Subject, "id" | "name">[];
  current: string;
  basePath: string;
  /** Outros parâmetros da URL a preservar. */
  params?: Record<string, string | undefined>;
}) {
  if (subjects.length <= 1) return null;
  const href = (id: string) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]);
    if (id) q.set("disciplina", id);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const tab = (id: string, label: string) => (
    <Link key={id || "all"} href={href(id)} className={cx("rounded-md px-3 py-1", current === id && "bg-surface-raised font-medium")}>
      {label}
    </Link>
  );
  return (
    <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-0.5 text-sm sm:inline-flex">
      {tab("", "Todas as disciplinas")}
      {subjects.map((s) => tab(s.id, s.name))}
    </div>
  );
}
