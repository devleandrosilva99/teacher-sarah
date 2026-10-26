"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { isUuid, withScope } from "@/server/db/repo";
import type { Student } from "@/lib/types";
import { newId, nowIso } from "@/lib/format";
import { deleteClassTx, deleteStudentTx } from "@/server/services/flows";
import { mailAvailable, sendMail } from "@/server/mail";
import { inviteEmail } from "@/server/mail/templates";
import { baseUrl } from "@/server/url";
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

  const result = await withScope(teacher.id, async (r) => {
    const existing = id ? await r.students.get(id) : null;
    if (id && !existing) return { error: "Aluno não encontrado." };

    // Nível por disciplina: campos "level:<id da disciplina>".
    const levels: Record<string, string> = {};
    for (const subject of await r.subjects.all()) {
      const v = raw[`level:${subject.id}`] ?? "";
      if (v && !subject.levels.some((l) => l.code === v)) return { error: `Nível inválido em ${subject.name}.` };
      if (v) levels[subject.id] = v;
    }

    const owner = await r.users.byEmail(data.email);
    const emailTaken = owner && owner.id !== existing?.userId;
    const sameTeacherDup = (await r.students.all()).some((x) => x.email === data.email && x.id !== id);
    if (emailTaken || sameTeacherDup) return { error: "Já existe uma conta com este e-mail." };

    const student: Student = existing
      ? { ...existing, ...data, levels }
      : {
          ...data,
          levels,
          id: newId(),
          teacherId: teacher.id,
          status: "active",
          avatarColor: Math.floor(Math.random() * 5),
          createdAt: nowIso(),
        };
    await r.students.put(student);

    // Mantém a conta de login com o mesmo e-mail e nome.
    if (existing?.userId && (existing.email !== data.email || existing.name !== data.name)) {
      const u = await r.users.get(existing.userId);
      if (u) await r.users.put({ ...u, email: data.email, name: data.name });
    }
    return { student, created: !existing };
  });
  if ("error" in result) return { error: result.error, fields: raw };
  revalidatePath("/professor", "layout");
  redirect(`/professor/alunos/${result.student.id}${result.created ? "?novo=1" : ""}`);
}

function newInvitation(teacherId: string, st: Student) {
  return {
    token: randomBytes(24).toString("base64url"),
    teacherId,
    studentId: st.id,
    email: st.email,
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  };
}

export async function createInvite(studentId: string): Promise<void> {
  const { teacher } = await requireTeacher();
  await withScope(teacher.id, async (r) => {
    const st = await r.students.get(studentId);
    if (!st || st.status !== "active") return;
    // Um link novo invalida os anteriores.
    await r.invitations.invalidateForStudent(studentId);
    await r.invitations.put(newInvitation(teacher.id, st));
  });
  revalidatePath(`/professor/alunos/${studentId}`);
}

/** Manda o link de acesso ao e-mail do aluno (usa o link válido ou gera um). */
export async function emailInvite(studentId: string): Promise<void> {
  const { teacher } = await requireTeacher();
  const back = (result: string) => redirect(`/professor/alunos/${studentId}?email=${result}`);
  if (!isUuid(studentId)) redirect("/professor/alunos");
  if (!mailAvailable()) back("indisponivel");
  const found = await withScope(teacher.id, async (r) => {
    const st = await r.students.get(studentId);
    if (!st || st.status !== "active") return null;
    let inv = await r.invitations.validForStudent(studentId);
    if (!inv) {
      await r.invitations.invalidateForStudent(studentId);
      const created = newInvitation(teacher.id, st);
      await r.invitations.put(created);
      inv = created;
    }
    return { st, inv };
  });
  if (!found) redirect("/professor/alunos");
  const link = `${await baseUrl()}/convite/${found.inv.token}`;
  const ok = await sendMail(inviteEmail(found.st.email, found.st.name, teacher.name, link, found.inv.expiresAt));
  back(ok ? "enviado" : "falhou");
}

export async function setStudentStatus(studentId: string, status: "active" | "archived"): Promise<void> {
  const { teacher } = await requireTeacher();
  await withScope(teacher.id, async (r) => {
    const st = await r.students.get(studentId);
    if (st) await r.students.put({ ...st, status });
  });
  revalidatePath("/professor", "layout");
}

/**
 * Exclusão definitiva (LGPD), numa transação: o cadastro do aluno (as entregas,
 * aulas individuais, convites, níveis e participação em turmas e envios saem
 * por ON DELETE CASCADE) e a conta de login.
 */
export async function deleteStudent(studentId: string): Promise<void> {
  const { teacher } = await requireTeacher();
  await withScope(teacher.id, (r) => deleteStudentTx(r, studentId));
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
  const id = String(formData.get("id") ?? "");
  const result = await withScope(teacher.id, async (r) => {
    const subject = await r.subjects.get(String(formData.get("subjectId") ?? ""));
    if (!subject) return { error: "Escolha a disciplina." };
    const mine = new Set((await r.students.all()).map((x) => x.id));
    const studentIds = formData.getAll("studentIds").map(String).filter((x) => mine.has(x));
    const existing = id ? await r.classes.get(id) : null;
    return r.classes.put({
      id: existing?.id ?? newId(),
      teacherId: teacher.id,
      subjectId: subject.id,
      name: name.slice(0, 80),
      level: subject.levels.some((l) => l.code === level) ? level : "",
      description,
      studentIds,
      archivedAt: existing?.archivedAt ?? "",
      createdAt: existing?.createdAt ?? nowIso(),
    });
  });
  if ("error" in result) return { error: result.error };
  revalidatePath("/professor/turmas");
  redirect(`/professor/turmas/${result.id}`);
}

export async function setClassArchived(classId: string, archived: boolean): Promise<void> {
  const { teacher } = await requireTeacher();
  if (isUuid(classId)) await withScope(teacher.id, (r) => r.classes.setArchived(classId, archived));
  revalidatePath("/professor", "layout");
  redirect(archived ? "/professor/turmas?arquivada=1" : `/professor/turmas/${classId}`);
}

/** Exclusão definitiva: só para turma sem nenhuma aula realizada (ver deleteClassTx). */
export async function deleteClass(classId: string): Promise<void> {
  const { teacher } = await requireTeacher();
  if (!isUuid(classId)) redirect("/professor/turmas");
  const result = await withScope(teacher.id, (r) => deleteClassTx(r, classId));
  revalidatePath("/professor", "layout");
  if ("error" in result && result.error === "has_done_lessons") redirect(`/professor/turmas/${classId}?erro=aulas`);
  redirect("/professor/turmas?excluida=1");
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
