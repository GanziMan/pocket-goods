import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LocaleProvider } from "@/lib/i18n/client";
import SiteFooter from "@/components/landing/SiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://pocket-goods.com";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: t.metadata.rootTitle,
      template: `%s | ${t.common.brandName}`,
    },
    description: t.metadata.rootDescription,
    keywords: [...t.metadata.keywords],
    authors: [{ name: t.common.brandName }],
    creator: t.common.brandName,
    openGraph: {
      type: "website",
      locale: locale === "ko" ? "ko_KR" : locale === "ja" ? "ja_JP" : locale === "zh-CN" ? "zh_CN" : locale === "pt-BR" ? "pt_BR" : "en_US",
      url: BASE_URL,
      siteName: t.common.brandName,
      title: t.metadata.rootTitle,
      description: t.metadata.rootDescription,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: t.metadata.rootTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t.metadata.rootTitle,
      description: t.metadata.rootDescription,
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
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    verification: {
      other: {
        "naver-site-verification": "554aa601f00482f1cc4666b09ce4775b46accf91",
      },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html lang={locale}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {!isProduction && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations()
                    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
                    .catch(() => {});
                }
                if ('caches' in window) {
                  caches.keys()
                    .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
                    .catch(() => {});
                }
              `,
            }}
          />
        )}
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: dictionary.metadata.jsonLdName,
              url: BASE_URL,
              applicationCategory: "DesignApplication",
              operatingSystem: "Web",
              description: dictionary.metadata.jsonLdDescription,
              offers: {
                "@type": "Offer",
                price: "4000",
                maxPrice: "6000",
                priceCurrency: "KRW",
                description: dictionary.metadata.jsonLdOffer,
              },
            }),
          }}
        />
        <LocaleProvider locale={locale} dictionary={dictionary}>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </LocaleProvider>
        {isProduction && (
          <Script id="sw-register" strategy="afterInteractive">
            {`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }`}
          </Script>
        )}
        {/* 카카오 SDK */}
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
          strategy="afterInteractive"
        />
        {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
          <Script id="kakao-init" strategy="afterInteractive">
            {`
              (function wait() {
                if (window.Kakao) {
                  if (!window.Kakao.isInitialized()) window.Kakao.init("${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}");
                } else { setTimeout(wait, 100); }
              })();
            `}
          </Script>
        )}
        {/* 채널톡 */}
        <Script id="channel-talk" strategy="afterInteractive">
          {`
            (function(){var w=window;if(w.ChannelIO){return}var ch=function(){ch.c(arguments)};ch.q=[];ch.c=function(args){ch.q.push(args)};w.ChannelIO=ch;function l(){if(w.ChannelIOInitialized){return}w.ChannelIOInitialized=true;var s=document.createElement("script");s.type="text/javascript";s.async=true;s.src="https://cdn.channel.io/plugin/ch-plugin-web.js";var x=document.getElementsByTagName("script")[0];if(x.parentNode){x.parentNode.insertBefore(s,x)}}if(document.readyState==="complete"){l()}else{w.addEventListener("DOMContentLoaded",l);w.addEventListener("load",l)}})();
            ChannelIO('boot',{pluginKey:"578bd0a2-1195-4051-ab67-4c82fb21909f"});
          `}
        </Script>
      </body>
    </html>
  );
}
