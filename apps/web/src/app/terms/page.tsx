import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관",
  description: "웅랩(UngLabs) 포켓굿즈 이용약관",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">이용약관</h1>
      <p className="mb-8 text-sm text-muted-foreground">시행일: 2026년 4월 7일</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="mb-2 text-lg font-semibold">1. 서비스명 및 목적</h2>
          <p>본 약관은 웅랩(UngLabs)이 운영하는 pocket-goods.com(이하 &quot;서비스&quot;)의 이용 조건 및 절차를 규정합니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">2. 회원/비회원 구매 규정</h2>
          <p>서비스는 상품 특성에 따라 회원 또는 비회원 구매를 지원할 수 있습니다. 주문 화면에 고지된 방식에 따라 구매가 진행됩니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">3. 주문 및 결제 성립</h2>
          <p>이용자가 상품 정보를 확인하고 결제를 완료하면 주문이 성립합니다. 결제는 포트원/토스페이먼츠 결제창을 통해 처리됩니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">4. 제공 방식</h2>
          <p>현재 판매 상품은 투명 스티커이며, 주문 확인 후 제작을 시작해 배송 방식으로 제공합니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">5. 청약철회/환불 기준</h2>
          <p>환불 기준은 환불/취소 정책 페이지를 따릅니다. 제작 시작 이후에는 단순 변심 환불이 제한될 수 있습니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">6. 책임 제한</h2>
          <p>서비스는 천재지변, 시스템 장애, 이용자의 귀책 사유로 인한 손해에 대해 법령이 허용하는 범위 내에서 책임이 제한됩니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">7. 문의처</h2>
          <p>문의 이메일: qjatn50089@gmail.com</p>
        </section>
      </div>
    </main>
  );
}
