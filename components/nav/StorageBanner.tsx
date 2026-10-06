import { meta } from "@/server/db/repo";

/** Aviso exibido quando o deploy roda sem banco persistente. */
export default function StorageBanner() {
  if (meta.storageKind() !== "memory") return null;
  return (
    <div className="bg-warn-bg px-4 py-2 text-center text-xs text-warn-fg">
      Modo demonstração: sem banco de dados configurado, as alterações podem se perder a qualquer momento.
    </div>
  );
}
