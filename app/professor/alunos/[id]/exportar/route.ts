import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { exportStudentData } from "@/server/services/export";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher" || !user.teacherId) return new NextResponse("Não autorizado", { status: 401 });
  const { id } = await params;
  const data = await exportStudentData(user.teacherId, id);
  if (!data) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="aluno-${id}.json"`,
    },
  });
}
