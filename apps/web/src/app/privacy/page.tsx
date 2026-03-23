import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "포켓굿즈 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold">개인정보처리방침</h1>
      <p className="mb-6 text-sm text-muted-foreground">시행일: 2025년 6월 1일</p>

      <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="mb-3 text-lg font-semibold">1. 개인정보의 수집 및 이용 목적</h2>
          <p>
            포켓굿즈(이하 &ldquo;서비스&rdquo;)는 다음의 목적을 위해 개인정보를 수집하고 이용합니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>회원 식별 및 로그인 기능 제공</li>
            <li>AI 이미지 생성 서비스 제공 (프로필 사진, 굿즈 디자인)</li>
            <li>일일 무료 생성 횟수 관리</li>
            <li>고객 문의 응대 (채널톡)</li>
            <li>서비스 이용 통계 분석 및 개선</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">2. 수집하는 개인정보 항목</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4 text-left font-medium">수집 시점</th>
                <th className="py-2 pr-4 text-left font-medium">수집 항목</th>
                <th className="py-2 text-left font-medium">수집 방법</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-2 pr-4">소셜 로그인 시</td>
                <td className="py-2 pr-4">닉네임, 프로필 이미지, 이메일(선택)</td>
                <td className="py-2">카카오/Google OAuth</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">서비스 이용 시</td>
                <td className="py-2 pr-4">업로드한 사진 (AI 처리 목적으로 서버에 전송되나, 처리 완료 즉시 삭제되며 서버에 저장되지 않습니다)</td>
                <td className="py-2">이용자 직접 제공</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">자동 수집</td>
                <td className="py-2 pr-4">기기 정보, 브라우저 정보, 접속 IP, 방문 기록</td>
                <td className="py-2">Google Analytics, 쿠키</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">3. 개인정보의 보유 및 이용 기간</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>회원 정보:</strong> 회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다.
            </li>
            <li>
              <strong>업로드 사진:</strong> AI 이미지 생성을 위해 서버에 일시적으로 전송되며, 처리 완료 즉시 삭제됩니다. 서버 및 데이터베이스에 보관하지 않습니다.
            </li>
            <li>
              <strong>서비스 이용 기록:</strong> 서비스 개선 목적으로 최대 1년간 보관 후 파기합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">4. 개인정보의 제3자 제공</h2>
          <p>
            서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령에 의해 요구되는 경우</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">5. 개인정보 처리 위탁</h2>
          <p>서비스는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.</p>
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4 text-left font-medium">수탁업체</th>
                <th className="py-2 text-left font-medium">위탁 업무</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-2 pr-4">Supabase Inc.</td>
                <td className="py-2">데이터베이스 및 파일 저장소 운영</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Google LLC</td>
                <td className="py-2">소셜 로그인, 웹 분석 (Google Analytics)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Kakao Corp.</td>
                <td className="py-2">소셜 로그인, 공유 기능</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Channel Corp.</td>
                <td className="py-2">고객 상담 채팅 (채널톡)</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">6. 이용자의 권리</h2>
          <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>개인정보 열람, 정정, 삭제 요청</li>
            <li>개인정보 처리 정지 요청</li>
            <li>회원 탈퇴 요청</li>
          </ul>
          <p className="mt-2">
            위 요청은 서비스 내 채널톡 또는 아래 연락처를 통해 접수할 수 있으며, 접수 후 지체 없이 처리합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">7. 쿠키 및 자동 수집 장치</h2>
          <p>
            서비스는 Google Analytics를 통해 방문자의 이용 패턴을 분석합니다.
            이용자는 브라우저 설정에서 쿠키를 거부할 수 있으나, 일부 서비스 이용이 제한될 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">8. 개인정보의 안전성 확보 조치</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>모든 데이터 전송 시 SSL/TLS 암호화 적용</li>
            <li>접근 권한 최소화 및 관리</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">9. 만 14세 미만 아동의 개인정보</h2>
          <p>
            서비스는 만 14세 미만 아동의 개인정보를 수집하지 않습니다.
            만 14세 미만임이 확인된 경우 해당 정보를 즉시 파기합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">10. 개인정보 보호책임자</h2>
          <ul className="list-none space-y-1">
            <li><strong>담당자:</strong> 포켓굿즈 운영팀</li>
            <li><strong>이메일:</strong> qjatn50089@gmail.com</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">11. 개인정보처리방침 변경</h2>
          <p>
            본 개인정보처리방침은 법령 및 서비스 변경에 따라 수정될 수 있으며,
            변경 시 서비스 내 공지를 통해 안내합니다.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} 포켓굿즈. All rights reserved.
      </div>
    </main>
  );
}
