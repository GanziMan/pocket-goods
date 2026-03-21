import type { Locale } from "../config";
import type { Dictionary } from "./types";
import ko from "./ko";
import en from "./en";
import ja from "./ja";
import ptBR from "./pt-BR";
import zhCN from "./zh-CN";

export type { Dictionary } from "./types";

const dictionaries: Record<Locale, Dictionary> = {
  ko,
  en,
  ja,
  "pt-BR": ptBR,
  "zh-CN": zhCN,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.ko;
}
