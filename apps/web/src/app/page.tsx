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
            <li><strong>상품 가격:</strong> A6 4,000원 · A5 5,000원 · A4 6,000원</li>
            <li><strong>배송비:</strong> 4,000원 별도 · 묶음 주문 시 1회 부과</li>
            <li><strong>상품 설명:</strong> 직접 디자인한 이미지를 투명 스티커로 제작해드립니다.</li>
            <li><strong>제공 방식:</strong> 실물 제작 및 바로 배송</li>
            <li><strong>제공 시점:</strong> 주문 확인 후 제작을 시작해 배송합니다.</li>
            <li><strong>환불 기준:</strong> 제작 전 결제 취소 가능, 제작 시작 후 단순 변심 환불 제한 (<Link href="/refund" className="underline">환불/취소 정책</Link>)</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/design" className="rounded-md bg-foreground px-3 py-2 font-medium text-background">스티커 디자인하기</Link>
            <Link href="/product/sticker" className="rounded-md border px-3 py-2 font-medium">상품 안내 보기</Link>
          </div>
        </article>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-8">
        <h2 className="mb-4 text-xl font-bold">스티커 제작 안내</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["재질", "투명 PET 소재와 방수 코팅으로 제작합니다."],
            ["가격", "A6 4,000원, A5 5,000원, A4 6,000원이며 배송비는 별도입니다."],
            ["배송", "주문 확인 후 제작을 시작해 준비되는 대로 발송합니다."],
            ["취소", "제작 전에는 취소 가능, 제작 시작 후에는 제한될 수 있습니다."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
