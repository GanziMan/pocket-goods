export const LOCALES = ["ko", "en", "ja", "pt-BR", "zh-CN"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";
export const COOKIE_NAME = "NEXT_LOCALE";

export function isValidLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  "pt-BR": "Português",
  "zh-CN": "中文",
};
