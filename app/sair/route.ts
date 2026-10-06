import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/session";

// Encerra a sessão e volta ao login (usado quando a conta deixa de ser válida).
export function GET(request: NextRequest) {
  const m = request.nextUrl.searchParams.get("m");
  const url = new URL(m ? `/entrar?m=${encodeURIComponent(m)}` : "/entrar", request.url);
  const res = NextResponse.redirect(url);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
