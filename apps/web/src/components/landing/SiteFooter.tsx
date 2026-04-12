import Link from "next/link";

export default function SiteFooter() {
  const businessInfo = [
    "상호 웅랩(UngLabs)",
    "대표 김정웅",
    "사업자등록번호 440-21-02327",
    "사업자 유형 간이과세자",
    "업태/종목 소매업·전자상거래 소매업",
    "사업장 서울특별시 서초구 강남대로41길 21-6, 3층 302호",
  ];

  return (
    <footer className="border-t bg-muted/20 px-4 py-5 text-xs text-muted-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 leading-relaxed">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {businessInfo.map((item) => (
            <span key={item}>{item}</span>
          ))}
          <a
            href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=4402102327"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            사업자정보확인
          </a>
        </div>

        <nav aria-label="정책 링크" className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">이용약관</Link>
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">개인정보처리방침</Link>
          <Link href="/refund" className="underline underline-offset-2 hover:text-foreground">환불/취소 정책</Link>
          <span>© {new Date().getFullYear()} PocketGoods. All rights reserved.</span>
        </nav>
      </div>
    </footer>
  );
}
