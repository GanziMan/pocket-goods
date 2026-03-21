"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CHARACTER_ASSETS } from "@/lib/assets";
import { ArrowRight } from "lucide-react";
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
    <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4">
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
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
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

        <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center">
          <Link href="/design">
            <Button className="h-12 gap-2 px-6 text-base">
              {t.hero.ctaDesign}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/ai-profile">
            <Button className="h-12 gap-2 px-6 text-base border-[1.5px]" variant="outline">
              {t.hero.ctaProfile}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {t.hero.freeInfo}
          <span className="hidden sm:inline"> &middot; </span>
          <br className="sm:hidden" />
          <Link
            href="/login"
            className="font-semibold text-primary underline underline-offset-2"
          >
            {t.hero.loginBenefit}
          </Link>
        </p>
      </div>
    </section>
  );
}
