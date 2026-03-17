"use client";

import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const next = searchParams.get("next") ?? "/design";

  const handleKakaoLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* 로고 */}
        <Link href="/" className="inline-flex items-center gap-2">
          <Image src="/logo.png" alt="포켓굿즈" width={40} height={40} />
          <span className="text-xl font-bold">포켓굿즈</span>
        </Link>

        {/* 혜택 안내 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">로그인하고 더 많이 만들기</h1>
          <p className="text-sm text-muted-foreground">
            카카오 로그인하면 AI 이미지 생성을
            <br />
            <span className="font-semibold text-primary">하루 10회 무료</span>로
            이용할 수 있어요
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
          카카오로 시작하기
        </button>

        {error && (
          <p className="text-xs text-red-500">
            로그인 중 문제가 발생했습니다. 다시 시도해주세요.
          </p>
        )}

        {/* 비로그인 안내 */}
        <p className="text-xs text-muted-foreground">
          로그인 없이도{" "}
          <Link href="/design" className="underline underline-offset-2">
            하루 2회 무료
          </Link>
          로 이용 가능해요
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
