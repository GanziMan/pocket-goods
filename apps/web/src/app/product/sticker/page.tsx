import Link from "next/link";
import type { Metadata } from "next";
import { PRINT_PRICE_KRW, SHIPPING_FEE_KRW } from "@/lib/order-pricing";

const STICKER_PRICE_KRW = PRINT_PRICE_KRW.A6;

export const metadata: Metadata = {
  title: "투명 스티커",
  description: "투명 스티커 상품 안내",
};

export default function StickerProductPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">투명 스티커</h1>
      <p className="mb-8 text-sm text-muted-foreground">현재 판매 중인 실물 배송 상품 안내</p>

      <div className="rounded-lg border p-5 text-sm leading-relaxed">
        <dl className="space-y-3">
          <div>
            <dt className="font-semibold">상품명</dt>
            <dd>투명 스티커</dd>
          </div>
          <div>
            <dt className="font-semibold">상품 가격</dt>
            <dd>{STICKER_PRICE_KRW.toLocaleString("ko-KR")}원 (VAT 포함)</dd>
          </div>
          <div>
            <dt className="font-semibold">배송비</dt>
            <dd>{SHIPPING_FEE_KRW.toLocaleString("ko-KR")}원 별도 · 묶음 주문 시 1회 부과</dd>
          </div>
          <div>
            <dt className="font-semibold">상품 설명</dt>
            <dd>직접 디자인한 이미지를 투명 스티커로 제작해드립니다.</dd>
          </div>
          <div>
            <dt className="font-semibold">제공 방식</dt>
            <dd>실물 제작 및 바로 배송</dd>
          </div>
          <div>
            <dt className="font-semibold">제공 시점</dt>
            <dd>주문 확인 후 제작을 시작해 배송합니다.</dd>
          </div>
          <div>
            <dt className="font-semibold">환불/취소 기준</dt>
            <dd>
              제작 전 결제 취소 가능, 제작 시작 후 단순 변심 환불 제한. 상세 기준은 <Link href="/refund" className="underline">환불/취소 정책</Link> 참고.
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/design" className="inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
          스티커 디자인하기
        </Link>
        <Link href="/checkout/sticker" className="inline-flex rounded-md border px-4 py-2 text-sm font-medium">
          결제 정보 보기
        </Link>
      </div>
    </main>
  );
}
