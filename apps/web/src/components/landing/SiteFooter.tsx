import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t bg-muted/20 px-4 py-8 text-sm">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 text-foreground/90">
        <h2 className="text-base font-semibold">사업자 정보</h2>
        <ul className="space-y-1 leading-relaxed">
          <li>상호: 웅랩(UngLabs)</li>
          <li>대표자: 김정웅</li>
          <li>사업자등록번호: 440-21-02327</li>
          <li>사업자 유형: 간이과세자</li>
          <li>업태/종목: 소매업 / 전자상거래 소매업</li>
          <li>개업연월일: 2026-04-07</li>
          <li>사업장 소재지: 서울특별시 서초구 강남대로41길 21-6, 3층 302호(서초동)</li>
        </ul>

        <nav aria-label="정책 링크" className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-sm">
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">이용약관</Link>
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">개인정보처리방침</Link>
          <Link href="/refund" className="underline underline-offset-2 hover:text-foreground">환불/취소 정책</Link>
        </nav>
      </div>
    </footer>
  );
}
