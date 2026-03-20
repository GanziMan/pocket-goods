import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "포켓굿즈 — 나만의 굿즈 디자인",
    short_name: "포켓굿즈",
    description:
      "나만의 캐릭터, 반려동물, 아기 사진으로 키링·스티커를 1분 만에 만들어보세요.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
