"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Paintbrush, Sparkles, PawPrint, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import UserMenu from "@/components/auth/UserMenu";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useLocale } from "@/lib/i18n/client";

export function LandingNav() {
  const { t } = useLocale();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const nickname =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    t.common.user;
  const avatarUrl = user?.user_metadata?.avatar_url;

  const navLinks = [
    { href: "/design", label: t.nav.editor, icon: Paintbrush },
    { href: "/ai-profile", label: t.nav.aiProfile, icon: Sparkles },
    { href: "/pet-profile", label: t.nav.petProfile, icon: PawPrint },
  ];

  return (
    <>
      {/* Mobile Header */}
      <nav className="fixed top-0 z-50 flex h-14 w-full items-center justify-between border-b bg-white px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={28} height={28} className="rounded" />
          <span className="text-sm font-bold tracking-tight">
            {t.common.brandName}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <UserMenu compact />
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground"
            aria-label="Menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <Drawer direction="right" open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="h-full">
          <DrawerTitle className="sr-only">Menu</DrawerTitle>
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b px-4 py-4">
            <Link href="/" className="flex items-center gap-2" onClick={() => setDrawerOpen(false)}>
              <Image src="/logo.png" alt="Logo" width={24} height={24} className="rounded" />
              <span className="text-sm font-bold tracking-tight">
                {t.common.brandName}
              </span>
            </Link>
            <DrawerClose asChild>
              <button className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-zinc-100 hover:text-foreground">
                <X className="size-5" />
              </button>
            </DrawerClose>
          </div>

          {/* User Section */}
          <div className="border-b px-4 py-4">
            {user ? (
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={nickname} className="size-10 rounded-full" />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100">
                    <span className="text-sm font-medium text-zinc-500">
                      {nickname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium">{nickname}</span>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                {t.common.login}
              </Link>
            )}
          </div>

          {/* Nav Links */}
          <div className="flex-1 px-2 py-2">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-zinc-50 hover:text-foreground"
              >
                <Icon className="size-5" />
                {label}
              </Link>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-auto border-t px-4 py-4">
            <div className="mb-3">
              <LanguageSwitcher />
            </div>
            {user && (
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-zinc-50 hover:text-foreground"
              >
                <LogOut className="size-4" />
                {t.common.logout}
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Desktop Header */}
      <nav className="fixed top-0 z-50 hidden w-full items-center justify-between bg-background/80 px-8 py-3 backdrop-blur-md md:flex">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold">
            {t.common.brandName}
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 break-keep text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </nav>
    </>
  );
}
