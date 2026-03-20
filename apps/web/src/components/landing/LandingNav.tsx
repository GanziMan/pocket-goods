"use client";


import Link from "next/link";
import UserMenu from "@/components/auth/UserMenu";

interface LandingNavProps {
  locale?: "ko" | "en";
}

export function LandingNav({ locale = "ko" }: LandingNavProps) {
  const isEn = locale === "en";

  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-md md:px-8">
      <Link href={isEn ? "/en/ai-profile" : "/"} className="flex shrink-0 items-center gap-2">
        <span className="hidden text-sm font-semibold md:inline">
          {isEn ? "Pocket Goods" : "포켓굿즈"}
        </span>
      </Link>
      <div className="flex items-center gap-2 md:gap-4">
        <Link
          href="/design"
          className="shrink-0 break-keep text-xs font-medium text-muted-foreground transition-colors hover:text-foreground md:text-sm"
        >
          {isEn ? "Editor" : "편집"}
        </Link>
        <Link
          href={isEn ? "/en/ai-profile" : "/ai-profile"}
          className="shrink-0 break-keep text-xs font-medium text-muted-foreground transition-colors hover:text-foreground md:text-sm"
        >
          {isEn ? "AI Profile" : "AI 프로필"}
        </Link>
        <Link
          href={isEn ? "/en/pet-profile" : "/pet-profile"}
          className="shrink-0 break-keep text-xs font-medium text-muted-foreground transition-colors hover:text-foreground md:text-sm"
        >
          {isEn ? "Pet" : "펫 프로필"}
        </Link>
        <UserMenu />
      </div>
    </nav>
  );
}
