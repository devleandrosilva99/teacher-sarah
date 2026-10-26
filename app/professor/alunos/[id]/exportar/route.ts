import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { teachers } from "@/server/db/repo";
import { exportStudentData } from "@/server/services/export";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const teacher = user?.role === "teacher" ? await teachers.byUserId(user.id) : null;
  if (!teacher) return new NextResponse("Não autorizado", { status: 401 });
  const { id } = await params;
  const data = await exportStudentData(teacher.id, teacher.id, id);
  if (!data) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="aluno-${id}.json"`,
    },
  });
}
