import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { FooterCTA } from "@/components/landing/FooterCTA";
import { LandingNav } from "@/components/landing/LandingNav";

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
