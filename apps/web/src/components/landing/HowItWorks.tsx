"use client";

import { MousePointerClick, Palette, ShoppingBag } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const steps = [
  {
    icon: MousePointerClick,
    title: "캐릭터 선택",
    description: "귀여운 캐릭터를 고르거나 내 사진을 업로드하세요.",
  },
  {
    icon: Palette,
    title: "자유롭게 꾸미기",
    description: "텍스트, 스티커, AI 이미지로 나만의 디자인을 완성하세요.",
  },
  {
    icon: ShoppingBag,
    title: "다운로드",
    description: "키링 또는 스티커로 이미지를 받아보세요!",
  },
];

export function HowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section className="bg-muted/40 px-4 py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold md:text-3xl">
          이렇게 만들어요
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          3단계면 나만의 굿즈 완성
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className={`flex flex-col items-center rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/5 transition-all duration-500 ${
                inView
                  ? "animate-fade-in-up opacity-100"
                  : "opacity-0 translate-y-6"
              }`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <step.icon className="size-7" />
              </div>
              <div className="mt-2 flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground break-keep">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
