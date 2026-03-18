"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FooterCTA() {
  return (
    <section className="bg-muted/40 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-3xl font-bold md:text-4xl">
          나만의 굿즈,
          <br />
          1분이면 완성
        </p>
        <p className="mt-3 text-muted-foreground">
          굿즈 디자인부터 AI 프로필 사진까지, 지금 바로 시작하세요.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          <Link
            href="/login"
            className="font-semibold text-primary underline underline-offset-2"
          >
            로그인
          </Link>
          하면 AI 이미지 생성 하루 10회 무료
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/design"
            className={buttonVariants({
              size: "lg",
              className: "h-12 gap-2 px-6 text-base",
            })}
          >
            굿즈 디자인하기
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/ai-profile"
            className={buttonVariants({
              size: "lg",
              variant: "outline",
              className: "h-12 gap-2 px-6 text-base",
            })}
          >
            AI 프로필 만들기
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
