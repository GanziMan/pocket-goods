import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free AI Profile Photo Generator | Pocket Goods",
  description:
    "Transform your photo into ID photo, Instagram aesthetic, or Ghibli anime style with AI. Free, no sign-up required.",
  openGraph: {
    title: "Free AI Profile Photo Generator | Pocket Goods",
    description:
      "Transform your photo into ID photo, Instagram aesthetic, or Ghibli anime style with AI. Free, no sign-up required.",
    url: "https://pocket-goods.com/en/ai-profile",
    images: [{ url: "https://pocket-goods.com/og-image-ai-profile.jpg" }],
  },
  alternates: {
    canonical: "https://pocket-goods.com/en/ai-profile",
    languages: {
      ko: "https://pocket-goods.com/ai-profile",
      en: "https://pocket-goods.com/en/ai-profile",
    },
  },
};

export default function EnAiProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
