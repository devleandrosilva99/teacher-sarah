import "server-only";

/**
 * IP do cliente para limites por IP. Na Vercel, x-vercel-forwarded-for (e
 * x-real-ip) são definidos pela própria plataforma; o primeiro valor de
 * x-forwarded-for pode ser forjado pelo cliente e não é usado. Fora da Vercel,
 * sem esses cabeçalhos, todos contam como "local".
 */
export function clientIp(h: Headers): string {
  const v = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip");
  const ip = v?.split(",")[0]?.trim();
  return ip && /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : "local";
}
