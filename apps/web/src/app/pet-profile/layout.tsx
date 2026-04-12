import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    title: t.metadata.petProfileTitle,
    description: t.metadata.petProfileDescription,
    openGraph: {
      title: t.metadata.petProfileTitle,
      description: t.metadata.petProfileDescription,
      url: "https://pocket-goods.com/pet-profile",
      images: [{ url: "https://pocket-goods.com/og-image-ai-profile.jpg" }],
    },
    alternates: {
      canonical: "https://pocket-goods.com/pet-profile",
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function PetProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
