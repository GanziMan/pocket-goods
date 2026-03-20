import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "반려동물 AI 프로필 | 포켓굿즈",
  description:
    "우리 아이 사진으로 귀여운 증명사진 스타일 프로필을 AI가 만들어드려요. 최대 3장까지 업로드 가능!",
  openGraph: {
    title: "반려동물 AI 프로필 | 포켓굿즈",
    description:
      "우리 아이 사진으로 귀여운 증명사진 스타일 프로필을 AI가 만들어드려요. 최대 3장까지 업로드 가능!",
    url: "https://pocket-goods.com/pet-profile",
    images: [{ url: "https://pocket-goods.com/og-image-ai-profile.jpg" }],
  },
  alternates: {
    canonical: "https://pocket-goods.com/pet-profile",
    languages: {
      ko: "https://pocket-goods.com/pet-profile",
      en: "https://pocket-goods.com/en/pet-profile",
    },
  },
};

export default function PetProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
