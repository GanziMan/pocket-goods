import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
  description:
    "로그인하고 AI 이미지 생성 하루 10회 무료로 이용하세요.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
