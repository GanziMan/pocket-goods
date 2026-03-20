import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const LOCALE_ROUTES = ["/ai-profile", "/pet-profile"];

function getPreferredLocale(request: NextRequest): "ko" | "en" {
  const acceptLang = request.headers.get("accept-language") ?? "";
  // ko, ko-KR 등이 포함되면 한국어
  if (/\bko\b/i.test(acceptLang)) return "ko";
  return "en";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /ai-profile 접속 시 브라우저 언어가 한국어가 아니면 /en/ai-profile로 리다이렉트
  if (LOCALE_ROUTES.includes(pathname)) {
    const locale = getPreferredLocale(request);
    if (locale === "en") {
      const url = request.nextUrl.clone();
      url.pathname = `/en${pathname}`;
      return NextResponse.redirect(url);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // 정적 파일과 _next 내부 요청 제외
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
