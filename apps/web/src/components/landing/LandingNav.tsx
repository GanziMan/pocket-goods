"use client";

import Link from "next/link";
import UserMenu from "@/components/auth/UserMenu";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/client";

export function LandingNav() {
  const { t } = useLocale();

  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-md md:px-8">
      <Link href="/" className="flex shrink-0 items-center gap-2">
        <span className="hidden text-sm font-semibold md:inline">
          {t.common.brandName}
        </span>
      </Link>
      <div className="flex items-center gap-2 md:gap-4">
        <Link
          href="/design"
          className="shrink-0 break-keep text-xs font-medium text-muted-foreground transition-colors hover:text-foreground md:text-sm"
        >
          {t.nav.editor}
        </Link>
        <Link
          href="/ai-profile"
          className="shrink-0 break-keep text-xs font-medium text-muted-foreground transition-colors hover:text-foreground md:text-sm"
        >
          {t.nav.aiProfile}
        </Link>
        <Link
          href="/pet-profile"
          className="shrink-0 break-keep text-xs font-medium text-muted-foreground transition-colors hover:text-foreground md:text-sm"
        >
          {t.nav.petProfile}
        </Link>
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </nav>
  );
}
