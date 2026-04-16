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

      <section id="products" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 pb-16 md:px-8">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-zinc-500">판매 중 상품</p>
            <h2 className="text-2xl font-extrabold tracking-tight">투명 스티커 제작</h2>
          </div>
          <p className="text-sm text-muted-foreground">A6부터 A4까지, 한 장부터 제작 가능</p>
        </div>
        <article className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
            <div className="p-5 text-sm leading-relaxed md:p-7">
              <h3 className="text-lg font-extrabold">AI로 만들고 직접 다듬는 투명 스티커</h3>
              <ul className="mt-4 grid gap-2 text-zinc-700 sm:grid-cols-2">
                <li className="rounded-2xl bg-zinc-50 p-3"><strong>가격</strong><br />A6 4,000원 · A5 5,000원 · A4 6,000원</li>
                <li className="rounded-2xl bg-zinc-50 p-3"><strong>배송</strong><br />4,000원 별도 · 묶음 주문 시 1회 부과</li>
                <li className="rounded-2xl bg-zinc-50 p-3"><strong>재질</strong><br />투명 PET 소재와 방수 코팅</li>
                <li className="rounded-2xl bg-zinc-50 p-3"><strong>제작</strong><br />주문 확인 후 제작을 시작해 발송</li>
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                제작 전 결제 취소 가능, 제작 시작 후 단순 변심 환불 제한 (
                <Link href="/refund" className="underline">환불/취소 정책</Link>)
              </p>
            </div>
            <div className="flex flex-col justify-between gap-4 border-t bg-zinc-950 p-5 text-white md:border-l md:border-t-0 md:p-7">
              <div>
                <p className="text-sm font-bold text-white/60">처음이라도 쉽게 시작</p>
                <p className="mt-2 text-2xl font-extrabold leading-tight">빈 캔버스에서 AI 만들기 화면이 바로 열려요.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/design" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-950">스티커 디자인하기</Link>
                <Link href="/product/sticker" className="rounded-full border border-white/30 px-4 py-2 text-sm font-bold text-white">상품 안내 보기</Link>
              </div>
            </div>
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
