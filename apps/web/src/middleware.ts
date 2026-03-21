import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const COOKIE_NAME = "NEXT_LOCALE";
const DEFAULT_LOCALE = "ko";
const LOCALES = ["ko", "en", "ja", "pt-BR", "zh-CN"];

function detectLocale(request: NextRequest): string {
  const acceptLang = request.headers.get("accept-language") ?? "";
  // Parse Accept-Language header and match against supported locales
  const segments = acceptLang.split(",").map((s) => s.trim().split(";")[0].trim());
  for (const seg of segments) {
    // Exact match
    if (LOCALES.includes(seg)) return seg;
    // pt-BR from pt
    if (seg.startsWith("pt")) return "pt-BR";
    // zh-CN from zh
    if (seg.startsWith("zh")) return "zh-CN";
    // Simple prefix match (ko, en, ja)
    const prefix = seg.split("-")[0];
    if (LOCALES.includes(prefix)) return prefix;
  }
  return DEFAULT_LOCALE;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /en/* 경로 301 리다이렉트 (기존 URL 호환)
  if (pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/en/, "");
    return NextResponse.redirect(url, 301);
  }

  // 쿠키에 NEXT_LOCALE이 없으면 Accept-Language에서 감지하여 설정
  const response = await updateSession(request);
  const existing = request.cookies.get(COOKIE_NAME)?.value;
  if (!existing || !LOCALES.includes(existing)) {
    const detected = detectLocale(request);
    response.cookies.set(COOKIE_NAME, detected, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    // 정적 파일과 _next 내부 요청 제외
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
