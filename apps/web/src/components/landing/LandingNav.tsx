"use client";

import Image from "next/image";
import Link from "next/link";
import UserMenu from "@/components/auth/UserMenu";

interface LandingNavProps {
  locale?: "ko" | "en";
}

export function LandingNav({ locale = "ko" }: LandingNavProps) {
  const isEn = locale === "en";

  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-md md:px-8">
      <Link href={isEn ? "/en/ai-profile" : "/"} className="flex items-center gap-2">
        <Image src="/logo.png" alt="Pocket Goods" width={28} height={28} />
        <span className="text-sm font-semibold">
          {isEn ? "Pocket Goods" : "포켓굿즈"}
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/design"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {isEn ? "Editor" : "디자인 편집"}
        </Link>
        <Link
          href={isEn ? "/en/ai-profile" : "/ai-profile"}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {isEn ? "AI Profile" : "AI 프로필"}
        </Link>
        <UserMenu />
      </div>
    </nav>
  );
}
