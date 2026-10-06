import { NextResponse, type NextRequest } from "next/server";

// Checagem otimista: sem cookie de sessão, nem chega a renderizar as áreas
// logadas. A verificação de verdade (assinatura, papel, dono do dado) é feita
// no servidor por requireTeacher/requireStudent/requireAdmin.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("ts_session")) {
    const url = new URL("/entrar", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/professor/:path*", "/aluno/:path*", "/admin/:path*"],
};
