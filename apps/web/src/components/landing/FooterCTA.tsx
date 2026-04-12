"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLocale } from "@/lib/i18n/client";

export function FooterCTA() {
  const { t } = useLocale();

  return (
    <section className="bg-muted/40 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-3xl font-bold md:text-4xl">
          {t.footer.cta}
          <br />
          {t.footer.ctaSub}
        </p>
        <p className="mt-3 text-muted-foreground">
          {t.footer.ctaDescription}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/design"
            className={buttonVariants({
              size: "lg",
              className: "h-12 gap-2 px-6 text-base",
            })}
          >
            {t.footer.ctaDesign}
            <ArrowRight className="size-4" />
          </Link>
          {/* AI 프로필 만들기 버튼은 스티커 단일 판매 전환 중이라 랜딩에서 숨김 */}
          {/* <Link
            href="/ai-profile"
            className={buttonVariants({
              size: "lg",
              variant: "outline",
              className: "h-12 gap-2 px-6 text-base",
            })}
          >
            {t.footer.ctaProfile}
            <ArrowRight className="size-4" />
          </Link> */}
        </div>
      </div>
    </section>
  );
}
