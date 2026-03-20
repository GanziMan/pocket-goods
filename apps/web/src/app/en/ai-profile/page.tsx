import ProfileGenerator from "@/components/ai-profile/ProfileGenerator";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Free AI Profile Photo Generator",
  url: "https://pocket-goods.com/en/ai-profile",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  inLanguage: "en",
  description:
    "Transform your photo into ID photo, Instagram aesthetic, or Ghibli anime style with AI. Free, no sign-up required.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "2 free AI generations per day, 10 with sign-in",
  },
  creator: {
    "@type": "Organization",
    name: "Pocket Goods",
    url: "https://pocket-goods.com",
  },
};

export default function EnAiProfilePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProfileGenerator locale="en" />
    </>
  );
}
