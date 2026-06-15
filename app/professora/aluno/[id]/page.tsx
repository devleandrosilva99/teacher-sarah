import { notFound } from "next/navigation";
import { students } from "@/lib/mock-data";
import StudentProfileClient from "./StudentProfileClient";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = students.find((s) => s.id === id);
  if (!student) notFound();

  return <StudentProfileClient student={student} />;
}
