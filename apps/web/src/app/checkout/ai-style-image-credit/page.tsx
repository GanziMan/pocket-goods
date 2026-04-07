import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "결제 - AI 스타일 변환 이미지 생성권",
  description: "AI 스타일 변환 이미지 생성권 결제 안내",
};

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">결제 정보 확인</h1>
      <p className="mb-8 text-sm text-muted-foreground">결제 전 아래 상품 및 환불 정책을 확인해 주세요.</p>

      <section className="rounded-lg border p-5 text-sm leading-relaxed">
        <h2 className="mb-4 text-lg font-semibold">주문 상품</h2>
        <ul className="space-y-2">
          <li><strong>상품명:</strong> AI 스타일 변환 이미지 생성권 (1회)</li>
          <li><strong>가격:</strong> 990원</li>
          <li><strong>상품 설명:</strong> 업로드한 사진을 AI 스타일 이미지로 변환하여 다운로드 가능한 결과물을 제공합니다.</li>
          <li><strong>제공 방식:</strong> 디지털 콘텐츠</li>
          <li><strong>제공 시점:</strong> 결제 완료 후 즉시 생성 시작, 생성 완료 후 다운로드 제공</li>
          <li>
            <strong>환불/취소 가능 조건:</strong> 생성 전 결제 취소 가능, 생성 완료 후 단순 변심 환불 불가 (
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
