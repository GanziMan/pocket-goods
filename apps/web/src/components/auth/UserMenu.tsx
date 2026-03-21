"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useLocale } from "@/lib/i18n/client";

interface UserMenuProps {
  compact?: boolean;
}

export default function UserMenu({ compact = false }: UserMenuProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLocale();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

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

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="shrink-0 break-keep text-xs font-medium text-muted-foreground transition-colors hover:text-foreground md:text-sm"
      >
        {t.common.login}
      </Link>
    );
  }

  const nickname =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    t.common.user;
  const avatarUrl = user.user_metadata?.avatar_url;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={nickname}
            className="size-6 rounded-full"
          />
        ) : (
          <User className="size-4 text-muted-foreground" />
        )}
        <button
          onClick={handleSignOut}
          className="text-xs text-muted-foreground hover:text-foreground"
          title={t.common.logout}
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={nickname}
          className="size-7 rounded-full"
        />
      ) : (
        <div className="flex size-7 items-center justify-center rounded-full bg-zinc-200">
          <User className="size-3.5 text-zinc-600" />
        </div>
      )}
      <button
        onClick={handleSignOut}
        className="text-muted-foreground hover:text-foreground"
        title={t.common.logout}
      >
        <LogOut className="size-3.5" />
      </button>
    </div>
  );
}
