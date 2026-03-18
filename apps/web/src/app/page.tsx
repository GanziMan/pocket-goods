import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { FooterCTA } from "@/components/landing/FooterCTA";
import { LandingNav } from "@/components/landing/LandingNav";

export const metadata: Metadata = {
  title: "나만의 키링·스티커 무료 디자인",
  description:
    "나만의 캐릭터, 강아지, 고양이, 아기 사진으로 키링·스티커를 1분 만에 만들어보세요. AI 이미지 생성으로 쉽고 빠르게!",
};

export default function Home() {
  return (
    <main className="min-h-dvh">
      <LandingNav />

      <HeroSection />
      <HowItWorks />
      {/* <ProductShowcase /> */}
      <FooterCTA />

      {/* Footer */}
      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} 포켓굿즈. All rights reserved.
      </footer>
    </main>
  );
}
