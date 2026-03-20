import ProfileGenerator from "@/components/ai-profile/ProfileGenerator";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AI 프로필 사진 만들기",
  url: "https://pocket-goods.com/ai-profile",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  description:
    "사진 한 장으로 증명사진, 인스타 감성, 지브리 스타일 프로필 사진을 AI가 만들어드려요.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
    description: "AI 이미지 생성 하루 2회 무료, 로그인 시 10회",
  },
  creator: {
    "@type": "Organization",
    name: "포켓굿즈",
    url: "https://pocket-goods.com",
  },
};

export default function AiProfilePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProfileGenerator />
    </>
  );
}
