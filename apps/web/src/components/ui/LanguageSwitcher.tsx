"use client";

import { useLocale } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS, COOKIE_NAME } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";

export function LanguageSwitcher() {
  const { locale } = useLocale();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as Locale;
    document.cookie = `${COOKIE_NAME}=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    window.location.reload();
  };

  return (
    <select
      value={locale}
      onChange={handleChange}
      className="shrink-0 rounded-md border border-zinc-200 bg-transparent px-1.5 py-0.5 text-xs text-muted-foreground outline-none hover:border-zinc-300 focus:border-primary cursor-pointer"
    >
      {LOCALES.map((loc) => (
        <option key={loc} value={loc}>
          {LOCALE_LABELS[loc]}
        </option>
      ))}
    </select>
  );
}
