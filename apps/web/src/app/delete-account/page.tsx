import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "계정 삭제",
  description: "포켓굿즈 계정 삭제 요청",
};

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">계정 삭제 요청</h1>
      <p className="mb-8 text-sm text-muted-foreground">포켓굿즈 (PocketGoods)</p>

      <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="mb-3 text-lg font-semibold">계정 삭제 방법</h2>
          <p className="mb-3">아래 방법 중 하나로 계정 삭제를 요청할 수 있습니다.</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              앱 또는 웹사이트 우측 하단의 <strong>채널톡 채팅</strong>에서 &ldquo;계정 삭제&rdquo;를 요청해 주세요.
            </li>
            <li>
              <strong>이메일</strong>로 요청: <a href="mailto:qjatn50089@gmail.com" className="underline">qjatn50089@gmail.com</a>으로 가입 시 사용한 소셜 계정 정보와 함께 삭제를 요청해 주세요.
            </li>
          </ol>
          <p className="mt-3">요청 접수 후 <strong>7일 이내</strong>에 처리됩니다.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">삭제되는 데이터</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>소셜 로그인 정보 (닉네임, 프로필 이미지, 이메일)</li>
            <li>서비스 이용 기록 (AI 이미지 생성 횟수 등)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">보관하지 않는 데이터</h2>
          <p>
            업로드한 사진은 AI 처리 완료 즉시 삭제되며, 서버 및 데이터베이스에 보관하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">유의사항</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>계정 삭제 시 모든 데이터는 즉시 파기되며 복구할 수 없습니다.</li>
            <li>삭제 완료 후 동일 소셜 계정으로 다시 가입할 수 있습니다.</li>
          </ul>
        </section>
      </div>

      <div className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} 포켓굿즈. All rights reserved.
      </div>
    </main>
  );
}
