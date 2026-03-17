import Image from "next/image";
import Link from "next/link";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { FooterCTA } from "@/components/landing/FooterCTA";

export default function Home() {
  return (
    <main className="min-h-dvh">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-md md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="포켓굿즈" width={28} height={28} />
          <span className="text-sm font-semibold">포켓굿즈</span>
        </Link>
        <Link
          href="/design"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          에디터 열기
        </Link>
      </nav>

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
