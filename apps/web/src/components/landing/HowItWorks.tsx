"use client";

import Image from "next/image";
import { MousePointerClick, Palette, ShoppingBag } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useLocale } from "@/lib/i18n/client";

const stepIcons = [MousePointerClick, Palette, ShoppingBag];

export function HowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const { t } = useLocale();

  return (
    <section className="bg-muted/40 px-4 py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold md:text-3xl">
          {t.howItWorks.title}
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          {t.howItWorks.subtitle}
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3 md:gap-8">
          {t.howItWorks.steps.map((step, i) => {
            const Icon = stepIcons[i];
            return (
              <div
                key={i}
                className={`flex flex-col items-center rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/5 transition-all duration-500 ${
                  inView
                    ? "animate-fade-in-up opacity-100"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-7" />
                </div>
                <div className="mt-2 flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground break-keep">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* 에디터 미리보기 */}
        <div
          className={`mt-14 transition-all duration-700 ${
            inView ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-6"
          }`}
          style={{ animationDelay: "500ms" }}
        >
          <p className="mb-4 text-center text-sm font-medium text-muted-foreground">
            {t.howItWorks.editorPreview}
          </p>
          <div className="relative mx-auto max-w-md">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-amber-100/60 via-transparent to-pink-100/60 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-foreground/10">
              <div className="flex items-center gap-1.5 border-b border-zinc-100 px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-red-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-green-400" />
                <span className="ml-3 text-[10px] text-zinc-400">pocket-goods.com/design</span>
              </div>
              <Image
                src="/goods-make.png"
                alt={t.howItWorks.editorAlt}
                width={480}
                height={600}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
