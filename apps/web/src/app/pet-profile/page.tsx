import PetProfileGenerator from "@/components/pet-profile/PetProfileGenerator";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "반려동물 AI 프로필",
  url: "https://pocket-goods.com/pet-profile",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  description:
    "우리 아이 사진으로 귀여운 프로필 사진을 AI가 만들어드려요. 최대 3장까지 업로드 가능!",
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

export default function PetProfilePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PetProfileGenerator />
    </>
  );
}
