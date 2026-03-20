import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pet AI Profile Photo | Pocket Goods",
  description:
    "Create a cute ID-style profile photo of your pet with AI. Upload up to 3 photos for better results!",
  openGraph: {
    title: "Pet AI Profile Photo | Pocket Goods",
    description:
      "Create a cute ID-style profile photo of your pet with AI. Upload up to 3 photos for better results!",
    url: "https://pocket-goods.com/en/pet-profile",
    images: [{ url: "https://pocket-goods.com/og-image-ai-profile.jpg" }],
  },
  alternates: {
    canonical: "https://pocket-goods.com/en/pet-profile",
    languages: {
      ko: "https://pocket-goods.com/pet-profile",
      en: "https://pocket-goods.com/en/pet-profile",
    },
  },
};

export default function EnPetProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
