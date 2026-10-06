"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/server/auth/session";
import { classes, lessons, students } from "@/server/db/repo";
import { notify } from "@/server/services/notify";
import { formatWeekdayTime, fromInputDateTime, newId, nowIso } from "@/lib/format";
import type { Lesson } from "@/lib/types";
import type { FormState } from "./state";

async function audience(teacherId: string, l: Pick<Lesson, "studentId" | "classId">) {
  const studs = await students.all(teacherId);
  if (l.studentId) return studs.filter((s) => s.id === l.studentId);
  const c = l.classId ? await classes.get(teacherId, l.classId) : null;
  return c ? studs.filter((s) => c.studentIds.includes(s.id)) : [];
}

export async function createLesson(_prev: FormState, formData: FormData): Promise<FormState> {
  const { teacher } = await requireTeacher();
  const target = String(formData.get("target") ?? "");
  const [kind, id] = target.split(":");
  let studentId = "";
  let classId = "";
  if (kind === "aluno" && (await students.get(teacher.id, id))) studentId = id;
  else if (kind === "turma" && (await classes.get(teacher.id, id))) classId = id;
  else return { error: "Escolha o aluno ou a turma." };

  const startsAt = fromInputDateTime(String(formData.get("startsAt") ?? ""));
  if (!startsAt) return { error: "Informe data e hora." };
  const durationMin = Math.max(15, Math.min(480, Number(formData.get("durationMin") ?? 60) || 60));
  const repeat = Math.max(1, Math.min(52, Number(formData.get("repeat") ?? 1) || 1));
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim().slice(0, 500);
  if (meetingUrl && !/^https?:\/\//i.test(meetingUrl)) return { error: "O link da aula precisa começar com https://." };
  const topic = String(formData.get("topic") ?? "").trim().slice(0, 200);
  const seriesId = repeat > 1 ? newId() : "";

  for (let i = 0; i < repeat; i++) {
    await lessons.put({
      id: newId(),
      teacherId: teacher.id,
      studentId,
      classId,
      startsAt: new Date(new Date(startsAt).getTime() + i * 7 * 86_400_000).toISOString(),
      durationMin,
      meetingUrl,
      topic,
      notes: "",
      vocabulary: [],
      attendance: {},
      status: "scheduled",
      seriesId,
      createdAt: nowIso(),
    });
  }
  for (const s of await audience(teacher.id, { studentId, classId })) {
    await notify(s.userId, `Aula agendada: ${formatWeekdayTime(startsAt)}${repeat > 1 ? ` (toda semana, ${repeat}x)` : ""}`, "/aluno/agenda");
  }
  revalidatePath("/professor/agenda");
  return { ok: repeat > 1 ? `${repeat} aulas agendadas.` : "Aula agendada." };
}

export async function updateLesson(lessonId: string, formData: FormData): Promise<void> {
  const { teacher } = await requireTeacher();
  const l = await lessons.get(teacher.id, lessonId);
  if (!l) return;
  const startsAt = fromInputDateTime(String(formData.get("startsAt") ?? "")) || l.startsAt;
  const status = String(formData.get("status") ?? l.status) as Lesson["status"];
  const attendance: Lesson["attendance"] = {};
  for (const s of await audience(teacher.id, l)) {
    const v = formData.get(`att:${s.id}`);
    if (v === "present" || v === "absent") attendance[s.id] = v;
  }
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim().slice(0, 500);
  await lessons.put({
    ...l,
    startsAt,
    durationMin: Math.max(15, Math.min(480, Number(formData.get("durationMin") ?? l.durationMin) || l.durationMin)),
    meetingUrl: meetingUrl && !/^https?:\/\//i.test(meetingUrl) ? l.meetingUrl : meetingUrl,
    topic: String(formData.get("topic") ?? "").trim().slice(0, 200),
    notes: String(formData.get("notes") ?? "").trim().slice(0, 5000),
    vocabulary: String(formData.get("vocabulary") ?? "")
      .split(/[\n,]/)
      .map((w) => w.trim())
      .filter(Boolean)
      .slice(0, 100),
    attendance,
    status: ["scheduled", "done", "canceled"].includes(status) ? status : l.status,
  });
  if (status === "canceled" && l.status !== "canceled") {
    for (const s of await audience(teacher.id, l)) await notify(s.userId, `Aula de ${formatWeekdayTime(l.startsAt)} cancelada.`, "/aluno/agenda");
  }
  revalidatePath("/professor/agenda", "layout");
  redirect(`/professor/agenda/${lessonId}?salvo=1`);
}

export async function deleteLesson(lessonId: string, wholeSeries: boolean): Promise<void> {
  const { teacher } = await requireTeacher();
  const l = await lessons.get(teacher.id, lessonId);
  if (!l) return;
  if (wholeSeries && l.seriesId) {
    for (const x of await lessons.all(teacher.id)) {
      if (x.seriesId === l.seriesId && x.startsAt >= l.startsAt) await lessons.remove(teacher.id, x.id);
    }
  } else {
    await lessons.remove(teacher.id, lessonId);
  }
  revalidatePath("/professor/agenda");
  redirect("/professor/agenda");
}
