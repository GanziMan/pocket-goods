import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "환불/취소 정책",
  description: "웅랩(UngLabs) 포켓굿즈 환불 및 취소 정책",
};

export default function RefundPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">환불/취소 정책</h1>
      <p className="mb-8 text-sm text-muted-foreground">시행일: 2026년 4월 7일</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="mb-2 text-lg font-semibold">1. 결제 취소 가능 조건</h2>
          <p>결제 직후 상품 생성/제공이 시작되기 전에는 결제 취소를 요청할 수 있습니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">2. 환불 가능 조건</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>시스템 오류로 상품이 정상 제공되지 않은 경우</li>
            <li>중복 결제가 발생한 경우</li>
            <li>결제 완료 후 제공 시작 전 취소 요청이 접수된 경우</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">3. 환불 불가 조건</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>디지털 상품 생성이 완료되었거나 다운로드가 가능한 상태가 된 경우</li>
            <li>이용자 귀책 사유로 결과물을 사용하지 못한 경우</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">4. 디지털 상품 환불 제한</h2>
          <p>디지털 콘텐츠의 특성상 사용·다운로드·생성 완료 이후에는 단순 변심 환불이 제한됩니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">5. 단순 변심 환불 기준</h2>
          <p>단순 변심은 생성/제공 시작 전 요청 건에 한해 검토됩니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">6. 시스템 오류·중복 결제·미제공 처리</h2>
          <p>결제내역 확인 후 재처리 또는 환불로 조치하며, 동일 이슈 재발 방지를 위해 로그를 점검합니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">7. 문의 채널 및 처리 기간</h2>
          <p>문의: qjatn50089@gmail.com (영업일 기준 통상 3일 이내 1차 회신)</p>
          <p className="mt-2">상품/결제 정보는 <Link href="/product/ai-style-image-credit" className="underline">상품 안내 페이지</Link>에서도 확인할 수 있습니다.</p>
        </section>
      </div>
    </main>
  );
}
