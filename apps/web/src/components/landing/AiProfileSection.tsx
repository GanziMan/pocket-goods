"use client";

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Camera, Sparkles, Palette } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useLocale } from "@/lib/i18n/client";

const gradients = [
  "from-blue-100 to-sky-100",
  "from-pink-100 to-rose-100",
  "from-green-100 to-emerald-100",
];

const emojis = ["📷", "✨", "🌿"];

const stepIcons = [Camera, Palette, Sparkles];

export function AiProfileSection() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const { t } = useLocale();

  return (
    <section className="px-4 py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {t.aiProfileSection.badge}
          </span>
          <h2 className="mt-3 text-2xl font-bold md:text-3xl">
            {t.aiProfileSection.title}
          </h2>
          <p className="mt-2 text-muted-foreground break-keep">
            {t.aiProfileSection.description}
          </p>
        </div>

        {/* 간단 흐름 */}
        <div className="mt-10 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          {t.aiProfileSection.steps.map((step, i) => {
            const Icon = stepIcons[i];
            return (
              <div key={i} className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-xs font-medium">{step.label}</span>
                </div>
                {i < t.aiProfileSection.steps.length - 1 && (
                  <ArrowRight className="size-4 text-zinc-300" />
                )}
              </div>
            );
          })}
        </div>

        {/* 스타일 카드 */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3 md:gap-6">
          {t.aiProfileSection.styles.map((s, i) => (
            <div
              key={i}
              className={`overflow-hidden rounded-2xl ring-1 ring-foreground/5 transition-all duration-500 ${
                inView
                  ? "animate-fade-in-up opacity-100"
                  : "opacity-0 translate-y-6"
              }`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div
                className={`flex h-28 items-center justify-center bg-gradient-to-br ${gradients[i]}`}
              >
                <span className="text-5xl">{emojis[i]}</span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground break-keep">
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 결과 예시 */}
        <div
          className={`mt-12 transition-all duration-700 ${
            inView ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-6"
          }`}
          style={{ animationDelay: "500ms" }}
        >
          <p className="mb-4 text-center text-sm font-medium text-muted-foreground">
            {t.aiProfileSection.exampleLabel}
          </p>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 blur-xl" />
              <div className="relative overflow-hidden rounded-2xl ring-1 ring-foreground/10 shadow-lg">
                <Image
                  src="/og-image-ai-profile.jpg"
                  alt={t.aiProfileSection.exampleAlt}
                  width={280}
                  height={280}
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-medium shadow-md ring-1 ring-foreground/5">
                {t.aiProfileSection.styleBadge}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/ai-profile"
            className={buttonVariants({
              size: "lg",
              className: "h-12 gap-2 px-6 text-base",
            })}
          >
            {t.aiProfileSection.ctaProfile}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/pet-profile"
            className={buttonVariants({
              size: "lg",
              variant: "outline",
              className: "h-12 gap-2 px-6 text-base",
            })}
          >
            {t.aiProfileSection.ctaPet}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
