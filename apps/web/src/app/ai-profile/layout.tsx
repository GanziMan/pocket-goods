import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 프로필 사진 만들기 | 포켓굿즈",
  description:
    "사진 한 장으로 증명사진, 인스타 감성, 지브리 스타일 프로필 사진을 AI가 만들어드려요.",
  openGraph: {
    title: "AI 프로필 사진 만들기 | 포켓굿즈",
    description:
      "사진 한 장으로 증명사진, 인스타 감성, 지브리 스타일 프로필 사진을 AI가 만들어드려요.",
  },
};

export default function AiProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
