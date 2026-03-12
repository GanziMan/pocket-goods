import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://pocketgoods.kr";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "포켓굿즈 — 나만의 키링 & 스티커",
    template: "%s | 포켓굿즈",
  },
  description:
    "나만의 캐릭터로 굿즈를 1분 만에 디자인하고 주문하세요. 아크릴 키링, 투명 스티커 POD 서비스.",
  keywords: [
    "포켓굿즈",
    "PocketGoods",
    "키링 만들기",
    "스티커 만들기",
    "굿즈 제작",
    "POD",
    "다꾸",
    "폰꾸",
    "아크릴 키링",
    "투명 스티커",
  ],
  authors: [{ name: "포켓굿즈" }],
  creator: "포켓굿즈",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: BASE_URL,
    siteName: "포켓굿즈",
    title: "포켓굿즈 — 나만의 키링 & 스티커",
    description:
      "나만의 캐릭터로 굿즈를 1분 만에 디자인하고 주문하세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "포켓굿즈 — 나만의 키링 & 스티커",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "포켓굿즈 — 나만의 키링 & 스티커",
    description:
      "나만의 캐릭터로 굿즈를 1분 만에 디자인하고 주문하세요.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  verification: {
    // google: "구글 서치콘솔 인증 코드",
    // naver: "네이버 서치어드바이저 인증 코드",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
