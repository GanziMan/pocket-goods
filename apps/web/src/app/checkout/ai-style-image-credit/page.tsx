import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "결제 - 투명 스티커",
  description: "투명 스티커 결제 안내",
};

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">결제 정보 확인</h1>
      <p className="mb-8 text-sm text-muted-foreground">결제 전 아래 상품 및 환불 정책을 확인해 주세요.</p>

      <section className="rounded-lg border p-5 text-sm leading-relaxed">
        <h2 className="mb-4 text-lg font-semibold">주문 상품</h2>
        <ul className="space-y-2">
          <li><strong>상품명:</strong> 투명 스티커</li>
          <li><strong>가격:</strong> 4,000원</li>
          <li><strong>상품 설명:</strong> 직접 디자인한 이미지를 투명 스티커로 제작해드립니다.</li>
          <li><strong>제공 방식:</strong> 실물 제작 및 바로 배송</li>
          <li><strong>제공 시점:</strong> 주문 확인 후 제작을 시작해 배송합니다.</li>
          <li>
            <strong>환불/취소 가능 조건:</strong> 제작 전 결제 취소 가능, 제작 시작 후 단순 변심 환불 제한 (
            <Link href="/refund" className="underline">환불/취소 정책 보기</Link>)
          </li>
        </ul>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          aria-label="포트원 또는 토스페이먼츠 결제창으로 진행"
        >
          결제 진행(연동 준비중)
        </button>
        <Link href="/product/ai-style-image-credit" className="rounded-md border px-4 py-2 text-sm font-medium">
          상품 페이지로 돌아가기
        </Link>
      </div>
    </main>
  );
}
