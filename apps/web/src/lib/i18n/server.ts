import { cookies } from "next/headers";
import { COOKIE_NAME, DEFAULT_LOCALE, isValidLocale } from "./config";
import type { Locale } from "./config";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  return isValidLocale(value) ? value : DEFAULT_LOCALE;
}
