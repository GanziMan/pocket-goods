"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useLocale } from "@/lib/i18n/client";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const next = searchParams.get("next") ?? "/design";
  const { t } = useLocale();

  const handleKakaoLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  const handleGoogleLogin = () => {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      redirect_uri: `${window.location.origin}/auth/callback/google`,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      state: encodeURIComponent(next),
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* 로고 */}
        <Link href="/" className="inline-flex items-center gap-2">
          <Image src="/logo.png" alt={t.common.brandName} width={40} height={40} />
          <span className="text-xl font-bold">{t.common.brandName}</span>
        </Link>

        {/* 혜택 안내 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t.login.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t.login.description}
            <br />
            <span className="font-semibold text-primary">{t.login.benefit}</span>
            {t.login.benefitSuffix}
          </p>
        </div>

        {/* 카카오 로그인 버튼 */}
        <button
          onClick={handleKakaoLogin}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-colors"
          style={{ backgroundColor: "#FEE500", color: "#191919" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M9 0.6C4.029 0.6 0 3.713 0 7.554c0 2.465 1.639 4.632 4.104 5.862l-1.04 3.826c-.092.339.295.607.587.407l4.56-3.026c.26.02.523.031.789.031 4.971 0 9-3.113 9-6.954S13.971.6 9 .6"
              fill="#191919"
            />
          </svg>
          {t.login.kakaoButton}
        </button>
        {/* 구글 로그인 버튼 */}
        <button
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z"
              fill="#4285F4"
            />
            <path
              d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
              fill="#34A853"
            />
            <path
              d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
              fill="#EA4335"
            />
          </svg>
          {t.login.googleButton}
        </button>
        {error && (
          <p className="text-xs text-red-500">
            {t.login.errorMessage}
          </p>
        )}

        {/* 비로그인 안내 */}
        <p className="text-xs text-muted-foreground">
          {t.login.guestInfo}{" "}
          <Link href="/design" className="underline underline-offset-2">
            {t.login.guestBenefit}
          </Link>
          {t.login.guestSuffix}
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
