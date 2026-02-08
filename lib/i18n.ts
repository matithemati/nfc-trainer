// lib/i18n.ts
import { translations, Lang } from "./translations";

export function getMessages(lang: string | undefined): {
  t: (key: string) => string;
  lang: Lang;
} {
  const normalized = (lang === "pl" || lang === "en" ? lang : "pl") as Lang;
  const dict = translations[normalized];

  return {
    lang: normalized,
    t: (key: string) => dict[key] ?? key,
  };
}
