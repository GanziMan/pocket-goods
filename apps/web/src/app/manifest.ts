import type { MetadataRoute } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

type ManifestScreenshot = NonNullable<MetadataRoute.Manifest["screenshots"]>[number] & {
  form_factor: "narrow" | "wide";
};

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const screenshots: ManifestScreenshot[] = [
    {
      src: "/screenshots/pocket-moible.png",
      sizes: "754x1338",
      type: "image/png",
      form_factor: "narrow",
    },
    {
      src: "/screenshots/pocket-pc.png",
      sizes: "1888x1708",
      type: "image/png",
      form_factor: "wide",
    },
  ];

  return {
    name: t.manifest.name,
    short_name: t.manifest.shortName,
    description: t.manifest.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["lifestyle", "shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: t.manifest.shortcutDesign ?? "Create Design",
        url: "/design",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
    screenshots,
    id: "/",
  };
}
