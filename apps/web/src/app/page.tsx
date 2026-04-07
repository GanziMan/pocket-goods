import Link from "next/link";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { AiProfileSection } from "@/components/landing/AiProfileSection";
import { LandingNav } from "@/components/landing/LandingNav";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    title: t.metadata.homeTitle,
    description: t.metadata.homeDescription,
  };
}

export default async function Home() {
  return (
    <main className="min-h-dvh">
      <LandingNav />
      <HeroSection />
      <HowItWorks />
      <AiProfileSection />

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-8">
        <h2 className="mb-4 text-xl font-bold">판매 중 상품</h2>
        <article className="rounded-lg border p-5 text-sm leading-relaxed">
          <h3 className="text-base font-semibold">AI 스타일 변환 이미지 생성권</h3>
          <ul className="mt-3 space-y-1">
            <li><strong>가격:</strong> 990원</li>
            <li><strong>상품 설명:</strong> 업로드한 사진을 AI 스타일 이미지로 변환한 결과물을 제공합니다.</li>
            <li><strong>제공 방식:</strong> 디지털 콘텐츠</li>
            <li><strong>제공 시점:</strong> 결제 후 즉시 생성 시작, 생성 완료 후 다운로드 제공</li>
            <li><strong>환불 기준:</strong> 생성 전 결제 취소 가능, 생성 완료 후 단순 변심 환불 불가 (<Link href="/refund" className="underline">환불/취소 정책</Link>)</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/product/ai-style-image-credit" className="rounded-md border px-3 py-2 font-medium">상품 상세 보기</Link>
            <Link href="/checkout/ai-style-image-credit" className="rounded-md bg-foreground px-3 py-2 font-medium text-background">결제 정보 보기</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
