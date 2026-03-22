import type { MetadataRoute } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocale();
  const t = getDictionary(locale);
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
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" as "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" as "any" },
    ],
    shortcuts: [
      {
        name: t.manifest.shortcutDesign ?? "Create Design",
        url: "/design",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
    id: "/",
  };
}
