import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { exportStudentData } from "@/server/services/export";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student" || !user.teacherId || !user.studentId) {
    return new NextResponse("Não autorizado", { status: 401 });
  }
  const data = await exportStudentData(user.teacherId, user.studentId);
  if (!data) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(JSON.stringify({ ...data, email: user.email }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados.json"',
    },
  });
}
