import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { AiProfileSection } from "@/components/landing/AiProfileSection";
// import { ProductShowcase } from "@/components/landing/ProductShowcase";
// import { FooterCTA } from "@/components/landing/FooterCTA";
import { LandingNav } from "@/components/landing/LandingNav";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    title: t.metadata.homeTitle,
    description: t.metadata.homeDescription,
  };
}

export default async function Home() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main className="min-h-dvh">
      <LandingNav />

      <HeroSection />
      <HowItWorks />
      {/* <FooterCTA /> */}
      <AiProfileSection />

      {/* <ProductShowcase /> */}

      {/* Footer */}
      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} {t.footer.copyright}. All rights reserved.
      </footer>
    </main>
  );
}
