import { students } from "@/lib/mock-data";
import StudentProfileClient from "./StudentProfileClient";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mockStudent = students.find((s) => s.id === id) ?? null;
  return <StudentProfileClient id={id} initialStudent={mockStudent} />;
}
