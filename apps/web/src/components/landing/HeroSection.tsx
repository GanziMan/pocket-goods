"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CHARACTER_ASSETS } from "@/lib/assets";
import { ArrowRight } from "lucide-react";

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
  return (
    <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4">
      {/* Floating character background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
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
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          나만의 굿즈,
          <br />
          <span className="bg-gradient-to-r from-amber-500 to-pink-500 bg-clip-text text-transparent">
            직접 만들어보세요
          </span>
        </h1>

        <p className="mt-4 text-base text-muted-foreground sm:mt-6 sm:text-lg break-keep">
          좋아하는 캐릭터, 반려동물, 아기 사진으로
          <br className="sm:block break-keep" />
          키링과 스티커를 1분 만에 디자인하세요.
        </p>

        <div className="mt-8 flex justify-center gap-3 sm:mt-10">
          <Link
            href="/design"
            className={buttonVariants({
              size: "lg",
              className: "h-12 gap-2 px-6 text-base",
            })}
          >
            지금 만들어보기
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
