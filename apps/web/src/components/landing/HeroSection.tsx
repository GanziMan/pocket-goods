"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CHARACTER_ASSETS } from "@/lib/assets";
import { ArrowRight, Sparkles, Truck, Wand2 } from "lucide-react";
import { useLocale } from "@/lib/i18n/client";

const floatingItems = CHARACTER_ASSETS.map((asset, i) => ({
  ...asset,
  style: {
    top: `${10 + ((i * 17) % 70)}%`,
    left: `${5 + ((i * 19) % 85)}%`,
    animationDelay: `${i * 0.8}s`,
    opacity: 0.15,
  },
}));

export function HeroSection() {
  const { t } = useLocale();

  return (
    <section className="relative flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-hidden px-4 pb-12 pt-24 md:min-h-[760px] md:pt-28">
      {/* Floating character background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true" role="presentation">
        {floatingItems.map((item, i) => (
          <div
            key={item.id}
            className={`absolute text-5xl md:text-7xl ${i % 2 === 0 ? "animate-float" : "animate-float-reverse"}`}
            style={item.style}
          >
            <img
              src={item.src}
              alt=""
              className="size-12 md:size-20 rounded-full"
            />
          </div>
        ))}
      </div>

      {/* Hero content */}
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/85 px-3 py-1.5 text-xs font-bold text-zinc-600 shadow-sm backdrop-blur">
          <Sparkles className="size-3.5 text-amber-500" />
          AI로 시작하고, 직접 다듬고, 스티커로 받기
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          {t.hero.title}
          <br />
          <span className="bg-gradient-to-r from-amber-500 to-pink-500 bg-clip-text text-transparent">
            {t.hero.titleHighlight}
          </span>
        </h1>

        <p className="mt-4 text-base text-muted-foreground sm:mt-6 sm:text-lg break-keep">
          {t.hero.description}
          <br className="sm:block break-keep" />
          {t.hero.descriptionSub}
        </p>

        <div className="mx-auto mt-6 grid max-w-xl gap-2 text-left text-xs font-semibold text-zinc-600 sm:grid-cols-3">
          {([
            [Wand2, "AI 이미지 생성"],
            [Sparkles, "텍스트·사진 편집"],
            [Truck, "제작 후 배송"],
          ] as const).map(([Icon, label]) => (
            <div key={label} className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
              <Icon className="size-4 text-zinc-950" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center">
          <Link href="/design">
            <Button className="h-12 gap-2 rounded-full px-7 text-base shadow-lg shadow-zinc-950/15">
              {t.hero.ctaDesign}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="#products">
            <Button className="h-12 gap-2 rounded-full border-[1.5px] bg-white/80 px-6 text-base backdrop-blur" variant="outline">
              가격·배송 보기
            </Button>
          </Link>
          {/* AI 프로필 만들기 버튼은 스티커 단일 판매 전환 중이라 랜딩에서 숨김 */}
          {/* <Link href="/ai-profile">
            <Button className="h-12 gap-2 px-6 text-base border-[1.5px]" variant="outline">
              {t.hero.ctaProfile}
              <ArrowRight className="size-4" />
            </Button>
          </Link> */}
        </div>
      </div>
    </section>
  );
}
