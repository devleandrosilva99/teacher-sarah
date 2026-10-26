"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { isUuid, teachers, users } from "@/server/db/repo";
import { adminResetLink } from "@/server/services/auth-email";
import { sendMail } from "@/server/mail";
import { baseUrl } from "@/server/url";

export async function setTeacherBlocked(teacherId: string, blocked: boolean): Promise<void> {
  await requireAdmin();
  const t = await teachers.get(teacherId);
  if (!t) return;
  const u = await users.get(t.userId);
  if (u) await users.put({ ...u, blocked });
  revalidatePath("/admin");
}

/** Manda ao professor um e-mail com link de redefinição. O admin não vê nem define a senha. */
export async function sendTeacherResetLink(userId: string): Promise<void> {
  await requireAdmin();
  if (!isUuid(userId)) redirect("/admin");
  const res = await adminResetLink(userId, await baseUrl());
  if ("error" in res) redirect(`/admin?reset=${res.error === "unavailable" ? "indisponivel" : "falhou"}`);
  redirect(`/admin?reset=${(await sendMail(res.mail)) ? "enviado" : "falhou"}`);
}
