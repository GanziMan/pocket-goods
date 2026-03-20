"use client";

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Camera, Sparkles, Palette } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const styles = [
  {
    emoji: "📷",
    title: "증명사진",
    description: "깔끔한 단색 배경, 정면 구도의 증명사진 스타일",
    gradient: "from-blue-100 to-sky-100",
  },
  {
    emoji: "✨",
    title: "화보/인스타",
    description: "감성 조명과 아웃포커스의 SNS 프로필 스타일",
    gradient: "from-pink-100 to-rose-100",
  },
  {
    emoji: "🌿",
    title: "지브리/애니",
    description: "따뜻한 색감의 지브리 애니메이션 스타일",
    gradient: "from-green-100 to-emerald-100",
  },
];

const steps = [
  { icon: Camera, label: "사진 업로드" },
  { icon: Palette, label: "스타일 선택" },
  { icon: Sparkles, label: "AI 생성" },
];

export function AiProfileSection() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section className="px-4 py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            NEW
          </span>
          <h2 className="mt-3 text-2xl font-bold md:text-3xl">
            AI 프로필 사진
          </h2>
          <p className="mt-2 text-muted-foreground break-keep">
            사진 한 장이면 다양한 스타일의 프로필 사진을 만들 수 있어요
          </p>
        </div>

        {/* 간단 흐름 */}
        <div className="mt-10 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <step.icon className="size-5" />
                </div>
                <span className="text-xs font-medium">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="size-4 text-zinc-300" />
              )}
            </div>
          ))}
        </div>

        {/* 스타일 카드 */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3 md:gap-6">
          {styles.map((s, i) => (
            <div
              key={s.title}
              className={`overflow-hidden rounded-2xl ring-1 ring-foreground/5 transition-all duration-500 ${
                inView
                  ? "animate-fade-in-up opacity-100"
                  : "opacity-0 translate-y-6"
              }`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div
                className={`flex h-28 items-center justify-center bg-gradient-to-br ${s.gradient}`}
              >
                <span className="text-5xl">{s.emoji}</span>
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
            AI가 만든 프로필 예시
          </p>
          <div className="flex justify-center">
            <div className="relative">
              {/* 배경 글로우 */}
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 blur-xl" />
              {/* 이미지 카드 */}
              <div className="relative overflow-hidden rounded-2xl ring-1 ring-foreground/10 shadow-lg">
                <Image
                  src="/og-image-ai-profile.jpg"
                  alt="AI 프로필 생성 결과 예시 - 지브리 스타일"
                  width={280}
                  height={280}
                  className="object-cover"
                />
              </div>
              {/* 스타일 뱃지 */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-medium shadow-md ring-1 ring-foreground/5">
                지브리 스타일
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
            AI 프로필 만들어보기
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
            반려동물 프로필 만들기
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
