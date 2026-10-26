"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { teachers, users } from "@/server/db/repo";

export async function setTeacherBlocked(teacherId: string, blocked: boolean): Promise<void> {
  await requireAdmin();
  const t = await teachers.get(teacherId);
  if (!t) return;
  const u = await users.get(t.userId);
  if (u) await users.put({ ...u, blocked });
  revalidatePath("/admin");
}
