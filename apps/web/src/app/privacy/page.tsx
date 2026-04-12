import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "웅랩(UngLabs) 포켓굿즈 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">개인정보처리방침</h1>
      <p className="mb-8 text-sm text-muted-foreground">시행일: 2026년 4월 7일</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="mb-2 text-lg font-semibold">1. 수집 항목</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>이름(또는 닉네임), 이메일</li>
            <li>배송정보(수령인 이름, 연락처, 주소, 배송 메모)</li>
            <li>결제정보(결제수단, 결제 승인 결과, 거래 식별값) ※ 카드번호 등 민감 결제정보는 결제사가 직접 처리</li>
            <li>주문정보(상품명, 결제금액, 주문시각, 처리상태)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">2. 수집 목적</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>스티커 주문 처리, 제작 요청, 배송 진행</li>
            <li>결제 처리 및 결제 확인</li>
            <li>고객 문의 대응 및 환불 처리</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">3. 보관 기간</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>주문/결제 관련 정보: 전자상거래 관련 법령에 따른 보관기간 동안 보관</li>
            <li>고객 문의 기록: 문의 처리 완료 후 최대 3년 보관</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">4. 제3자 제공 또는 처리 위탁</h2>
          <p>서비스는 결제 처리를 위해 포트원 및 토스페이먼츠를 이용하며, 결제 처리에 필요한 범위 내에서 정보 처리가 이루어집니다.</p>
          <p className="mt-2">스티커 제작 및 배송 처리를 위해 필요한 주문·배송 정보가 제작/배송 협력사에 전달될 수 있습니다.</p>
          <p className="mt-2">그 외 이용자의 개인정보를 판매하거나 마케팅 목적으로 임의 제공하지 않습니다.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">5. 이용자 권리 및 문의처</h2>
          <p>이용자는 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.</p>
          <p className="mt-2">문의: qjatn50089@gmail.com</p>
        </section>
      </div>
    </main>
  );
}
