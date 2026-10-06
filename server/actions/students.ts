"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { classes, invitations, lessons, students, submissions, assignments, users } from "@/server/db/repo";
import { LEVELS, type Student } from "@/lib/types";
import { newId, nowIso } from "@/lib/format";
import type { FormState } from "./state";

const str = (max: number) => z.string().trim().max(max).default("");

const StudentSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do aluno.").max(100),
  email: z.email("E-mail inválido.").max(254).transform((v) => v.toLowerCase()),
  phone: str(30),
  birthDate: str(10),
  guardianName: str(100),
  cpf: z
    .string()
    .trim()
    .max(14)
    .default("")
    .refine((v) => v === "" || validCpf(v), "CPF inválido."),
  cep: str(9),
  street: str(120),
  number: str(10),
  complement: str(60),
  neighborhood: str(60),
  city: str(60),
  state: str(2),
  level: z.enum(LEVELS),
  goal: str(300),
  notes: str(2000),
});

export async function saveStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const { teacher } = await requireTeacher();
  const raw = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = StudentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", fields: raw };
  const data = parsed.data;
  const id = String(formData.get("id") ?? "");

  const existing = id ? await students.get(teacher.id, id) : null;
  if (id && !existing) return { error: "Aluno não encontrado." };

  const owner = await users.byEmail(data.email);
  const emailTaken = owner && owner.id !== existing?.userId;
  const sameTeacherDup = (await students.all(teacher.id)).some((s) => s.email === data.email && s.id !== id);
  if (emailTaken || sameTeacherDup) return { error: "Já existe uma conta com este e-mail.", fields: raw };

  const student: Student = existing
    ? { ...existing, ...data }
    : {
        ...data,
        id: newId(),
        teacherId: teacher.id,
        status: "active",
        avatarColor: Math.floor(Math.random() * 5),
        createdAt: nowIso(),
      };
  await students.put(student);

  if (existing?.userId && existing.email !== data.email) {
    const u = await users.get(existing.userId);
    if (u) await users.changeEmail(u, data.email);
  }
  if (existing?.userId && existing.name !== data.name) {
    const u = await users.get(existing.userId);
    if (u) await users.put({ ...u, name: data.name });
  }
  revalidatePath("/professor", "layout");
  redirect(`/professor/alunos/${student.id}${existing ? "" : "?novo=1"}`);
}

export async function createInvite(studentId: string): Promise<void> {
  const { teacher } = await requireTeacher();
  const st = await students.get(teacher.id, studentId);
  if (!st || st.status !== "active") return;
  // Invalida convites anteriores do aluno.
  for (const inv of await invitations.all()) {
    if (inv.teacherId === teacher.id && inv.studentId === studentId && !inv.usedAt) {
      await invitations.put({ ...inv, usedAt: nowIso() });
    }
  }
  await invitations.put({
    token: randomBytes(24).toString("base64url"),
    teacherId: teacher.id,
    studentId,
    email: st.email,
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  });
  revalidatePath(`/professor/alunos/${studentId}`);
}

export async function setStudentStatus(studentId: string, status: "active" | "archived"): Promise<void> {
  const { teacher } = await requireTeacher();
  const st = await students.get(teacher.id, studentId);
  if (!st) return;
  await students.put({ ...st, status });
  revalidatePath("/professor", "layout");
}

/** Exclusão definitiva (LGPD): aluno, conta, entregas, convites e referências. */
export async function deleteStudent(studentId: string): Promise<void> {
  const { teacher } = await requireTeacher();
  const st = await students.get(teacher.id, studentId);
  if (!st) return;
  if (st.userId) {
    const u = await users.get(st.userId);
    if (u) await users.delete(u);
  }
  for (const s of await submissions.all(teacher.id)) if (s.studentId === studentId) await submissions.remove(teacher.id, s.id);
  for (const a of await assignments.all(teacher.id)) {
    if (a.studentIds.includes(studentId)) await assignments.put({ ...a, studentIds: a.studentIds.filter((x) => x !== studentId) });
  }
  for (const c of await classes.all(teacher.id)) {
    if (c.studentIds.includes(studentId)) await classes.put({ ...c, studentIds: c.studentIds.filter((x) => x !== studentId) });
  }
  for (const l of await lessons.all(teacher.id)) if (l.studentId === studentId) await lessons.remove(teacher.id, l.id);
  for (const inv of await invitations.all()) if (inv.teacherId === teacher.id && inv.studentId === studentId) await invitations.remove(inv.token);
  await students.remove(teacher.id, studentId);
  revalidatePath("/professor", "layout");
  redirect("/professor/alunos?excluido=1");
}

// ---------- turmas ----------

export async function saveClass(_prev: FormState, formData: FormData): Promise<FormState> {
  const { teacher } = await requireTeacher();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Informe o nome da turma." };
  const level = String(formData.get("level") ?? "");
  const description = String(formData.get("description") ?? "").trim().slice(0, 500);
  const mine = new Set((await students.all(teacher.id)).map((s) => s.id));
  const studentIds = formData.getAll("studentIds").map(String).filter((id) => mine.has(id));
  const id = String(formData.get("id") ?? "");
  const existing = id ? await classes.get(teacher.id, id) : null;
  const saved = await classes.put({
    id: existing?.id ?? newId(),
    teacherId: teacher.id,
    name: name.slice(0, 80),
    level: (LEVELS as readonly string[]).includes(level) ? (level as Student["level"]) : "",
    description,
    studentIds,
    createdAt: existing?.createdAt ?? nowIso(),
  });
  revalidatePath("/professor/turmas");
  redirect(`/professor/turmas/${saved.id}`);
}

export async function deleteClass(classId: string): Promise<void> {
  const { teacher } = await requireTeacher();
  await classes.remove(teacher.id, classId);
  revalidatePath("/professor/turmas");
  redirect("/professor/turmas");
}

function validCpf(value: string): boolean {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}
