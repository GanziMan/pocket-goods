import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
    default: "포켓굿즈 — 강아지·고양이·취미 맞춤 키링 & 스티커",
    template: "%s | 포켓굿즈",
  },
  description:
    "나만의 캐릭터, 강아지, 고양이, 아기 사진으로 키링·스티커를 1분 만에 만들어보세요. 취미·덕질·선물용 POD 굿즈 제작 서비스.",
  keywords: [
    "포켓굿즈",
    "PocketGoods",
    "강아지 키링",
    "고양이 키링",
    "반려동물 굿즈",
    "아기 키링",
    "아기 스티커",
    "취미 굿즈",
    "덕질 굿즈",
    "나만의 캐릭터 굿즈",
    "커스텀 캐릭터 키링",
    "커스텀 키링",
    "나만의 키링",
    "키링 만들기",
    "스티커 만들기",
    "아크릴 키링",
    "투명 스티커",
    "POD 굿즈",
    "굿즈 제작",
    "다꾸",
    "폰꾸",
    "선물 굿즈",
  ],
  authors: [{ name: "포켓굿즈" }],
  creator: "포켓굿즈",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: BASE_URL,
    siteName: "포켓굿즈",
    title: "포켓굿즈 — 강아지·고양이·취미 맞춤 키링 & 스티커",
    description:
      "나만의 캐릭터, 강아지, 고양이, 아기 사진으로 키링·스티커를 1분 만에 만들어보세요. 취미·덕질·선물용 POD 굿즈 제작 서비스.",
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
    title: "포켓굿즈 — 강아지·고양이·취미 맞춤 키링 & 스티커",
    description:
      "나만의 캐릭터, 강아지, 고양이, 아기 사진으로 키링·스티커를 1분 만에 만들어보세요.",
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
    icon: "/logo.png",
    apple: "/logo.png",
  },
  verification: {
    other: {
      "naver-site-verification": "554aa601f00482f1cc4666b09ce4775b46accf91",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YYTZZJ7PVD"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YYTZZJ7PVD');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
