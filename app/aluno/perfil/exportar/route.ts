import { NextResponse } from "next/server";
import { getCurrentUser, studentForUser } from "@/server/auth/session";
import { exportStudentData } from "@/server/services/export";

export async function GET() {
  const user = await getCurrentUser();
  const student = user?.role === "student" ? await studentForUser(user.id) : null;
  if (!user || !student || student.status !== "active") return new NextResponse("Não autorizado", { status: 401 });
  // Escopo do próprio aluno: a RLS limita o que entra na exportação.
  const data = await exportStudentData({ teacherId: student.teacherId, studentId: student.id }, student.teacherId, student.id);
  if (!data) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(JSON.stringify({ ...data, email: user.email }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados.json"',
    },
  });
}
