import AulaClient from "./AulaClient";

export default async function AulaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AulaClient id={id} />;
}
