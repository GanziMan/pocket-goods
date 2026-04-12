import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://pocket-goods.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/ai-profile",
        "/pet-profile",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
