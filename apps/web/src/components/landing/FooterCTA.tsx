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
          지금 바로 에디터에서 디자인해보세요.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          <Link
            href="/login"
            className="font-semibold text-primary underline underline-offset-2"
          >
            카카오 로그인
          </Link>
          하면 AI 이미지 생성 하루 10회 무료
        </p>
        <div className="mt-8">
          <Link
            href="/design"
            className={buttonVariants({
              size: "lg",
              className: "h-12 gap-2 px-6 text-base",
            })}
          >
            디자인 시작하기
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
