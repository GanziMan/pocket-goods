import ProfileGenerator from "@/components/ai-profile/ProfileGenerator";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function AiProfilePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t.metadata.aiProfileJsonLdName,
    url: "https://pocket-goods.com/ai-profile",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    description: t.metadata.aiProfileDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
      description: t.metadata.jsonLdOffer,
    },
    creator: {
      "@type": "Organization",
      name: t.metadata.jsonLdName,
      url: "https://pocket-goods.com",
    },
  };

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
