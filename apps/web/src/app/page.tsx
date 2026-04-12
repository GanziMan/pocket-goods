import Link from "next/link";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
// import { AiProfileSection } from "@/components/landing/AiProfileSection";
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
      {/* AI 프로필 프로모션은 스티커 단일 판매 전환 중이라 랜딩에서 숨김 */}
      {/* <AiProfileSection /> */}

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-8">
        <h2 className="mb-4 text-xl font-bold">판매 중 상품</h2>
        <article className="rounded-lg border p-5 text-sm leading-relaxed">
          <h3 className="text-base font-semibold">투명 스티커</h3>
          <ul className="mt-3 space-y-1">
            <li><strong>가격:</strong> 4,000원</li>
            <li><strong>상품 설명:</strong> 직접 디자인한 이미지를 투명 스티커로 제작해드립니다.</li>
            <li><strong>제공 방식:</strong> 실물 제작 및 바로 배송</li>
            <li><strong>제공 시점:</strong> 주문 확인 후 제작을 시작해 배송합니다.</li>
            <li><strong>환불 기준:</strong> 제작 전 결제 취소 가능, 제작 시작 후 단순 변심 환불 제한 (<Link href="/refund" className="underline">환불/취소 정책</Link>)</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/design" className="rounded-md bg-foreground px-3 py-2 font-medium text-background">스티커 디자인하기</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
