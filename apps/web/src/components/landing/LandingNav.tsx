"use client";

import Image from "next/image";
import Link from "next/link";
import UserMenu from "@/components/auth/UserMenu";

export function LandingNav() {
  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-md md:px-8">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.png" alt="포켓굿즈" width={28} height={28} />
        <span className="text-sm font-semibold">포켓굿즈</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/design"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          에디터 열기
        </Link>
        <Link
          href="/ai-profile"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          AI 프로필
        </Link>
        <UserMenu />
      </div>
    </nav>
  );
}
