import PetProfileGenerator from "@/components/pet-profile/PetProfileGenerator";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Pet AI Profile Photo",
  url: "https://pocket-goods.com/en/pet-profile",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  inLanguage: "en",
  description:
    "Create a cute profile photo of your pet with AI. Upload up to 3 photos for better results!",
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

export default function EnPetProfilePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PetProfileGenerator locale="en" />
    </>
  );
}
