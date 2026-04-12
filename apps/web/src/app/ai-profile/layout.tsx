import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    title: t.metadata.aiProfileTitle,
    description: t.metadata.aiProfileDescription,
    openGraph: {
      title: t.metadata.aiProfileTitle,
      description: t.metadata.aiProfileDescription,
      url: "https://pocket-goods.com/ai-profile",
      images: [{ url: "https://pocket-goods.com/og-image-ai-profile.jpg" }],
    },
    alternates: {
      canonical: "https://pocket-goods.com/ai-profile",
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function AiProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
