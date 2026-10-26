import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { logout } from "@/server/actions/auth";
import { setTeacherBlocked } from "@/server/actions/admin";
import { teachers, users, withScope } from "@/server/db/repo";
import ConfirmButton from "@/components/ConfirmButton";
import { Badge, Button, Card, PageHeader, Stat } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: "Administração" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const list = await teachers.all();
  // O administrador vê só contagens, não os dados pessoais dos alunos
  // (consulta agregada em escopo system).
  const counts = await withScope({ system: true }, (r) =>
    r.db.query<{ teacher_id: string; students: number; questions: number; assignments: number }>(
      `SELECT t.id AS teacher_id,
         (SELECT count(*)::int FROM students s WHERE s.teacher_id = t.id AND s.status = 'active') AS students,
         (SELECT count(*)::int FROM questions q WHERE q.teacher_id = t.id) AS questions,
         (SELECT count(*)::int FROM assignments a WHERE a.teacher_id = t.id) AS assignments
       FROM teachers t`
    )
  );
  const byTeacher = new Map(counts.map((c) => [c.teacher_id, c]));
  const rows = await Promise.all(
    list.map(async (t) => {
      const c = byTeacher.get(t.id);
      return { t, u: await users.get(t.userId), students: c?.students ?? 0, questions: c?.questions ?? 0, assignments: c?.assignments ?? 0 };
    })
  );
  rows.sort((a, b) => b.t.createdAt.localeCompare(a.t.createdAt));

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-semibold">{APP_NAME} · Administração</span>
          <div className="flex items-center gap-2 text-xs text-ink-2">
            {admin.email}
            <form action={logout}><button className="rounded-lg p-1.5 hover:bg-surface-raised" aria-label="Sair"><LogOut size={16} /></button></form>
          </div>
        </div>
        <PageHeader title="Professores" subtitle="Banco: PostgreSQL (Neon)" />
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Professores" value={rows.length} />
          <Stat label="Bloqueados" value={rows.filter((r) => r.u?.blocked).length} />
          <Stat label="Alunos ativos" value={rows.reduce((a, r) => a + r.students, 0)} />
          <Stat label="Atividades enviadas" value={rows.reduce((a, r) => a + r.assignments, 0)} />
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-3">
                  <th className="py-2 font-normal">Professor</th>
                  <th className="py-2 font-normal">Página</th>
                  <th className="py-2 text-right font-normal">Alunos</th>
                  <th className="py-2 text-right font-normal">Questões</th>
                  <th className="py-2 text-right font-normal">Desde</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ t, u, students: ns, questions: nq }) => (
                  <tr key={t.id}>
                    <td className="py-2">
                      <div className="font-medium">{t.name} {u?.blocked && <Badge variant="danger">Bloqueado</Badge>}</div>
                      <div className="text-xs text-ink-3">{u?.email}</div>
                    </td>
                    <td className="py-2"><Link href={`/p/${t.slug}`} className="text-xs text-brand" target="_blank">/p/{t.slug}</Link></td>
                    <td className="py-2 text-right">{ns}</td>
                    <td className="py-2 text-right">{nq}</td>
                    <td className="py-2 text-right text-xs text-ink-3">{formatDate(t.createdAt)}</td>
                    <td className="py-2 text-right">
                      <form action={setTeacherBlocked.bind(null, t.id, !u?.blocked)}>
                        {u?.blocked ? (
                          <Button type="submit" variant="secondary" className="px-2.5 py-1 text-xs">Desbloquear</Button>
                        ) : (
                          <ConfirmButton variant="danger" className="px-2.5 py-1 text-xs" message={`Bloquear ${t.name}? Ele e os alunos dele perdem o acesso.`}>Bloquear</ConfirmButton>
                        )}
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
