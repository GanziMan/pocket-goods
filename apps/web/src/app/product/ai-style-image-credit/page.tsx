import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 스타일 변환 이미지 생성권",
  description: "AI 스타일 변환 이미지 생성권 상품 안내",
};

export default function ProductDetailPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">AI 스타일 변환 이미지 생성권</h1>
      <p className="mb-8 text-sm text-muted-foreground">현재 판매 중인 디지털 상품 안내</p>

      <div className="rounded-lg border p-5 text-sm leading-relaxed">
        <dl className="space-y-3">
          <div>
            <dt className="font-semibold">상품명</dt>
            <dd>AI 스타일 변환 이미지 생성권 (1회)</dd>
          </div>
          <div>
            <dt className="font-semibold">실제 결제 금액</dt>
            <dd>990원 (VAT 포함)</dd>
          </div>
          <div>
            <dt className="font-semibold">상품 설명</dt>
            <dd>업로드한 사진을 선택한 스타일로 변환한 디지털 이미지를 생성합니다.</dd>
          </div>
          <div>
            <dt className="font-semibold">제공 방식</dt>
            <dd>디지털 콘텐츠 (웹에서 생성 후 다운로드)</dd>
          </div>
          <div>
            <dt className="font-semibold">제공 시점</dt>
            <dd>결제 완료 후 즉시 생성이 시작되며, 생성 완료 시 다운로드 가능합니다.</dd>
          </div>
          <div>
            <dt className="font-semibold">환불/취소 기준</dt>
            <dd>
              생성 전 결제 취소 가능, 생성 완료 후 단순 변심 환불 불가. 상세 기준은 <Link href="/refund" className="underline">환불/취소 정책</Link> 참고.
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6">
        <Link href="/checkout/ai-style-image-credit" className="inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
          결제 페이지로 이동
        </Link>
      </div>
    </main>
  );
}
