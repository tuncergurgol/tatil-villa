import type { AppLocale } from "@/i18n/routing";
import en from "@/lib/i18n/faq/en.json";
import de from "@/lib/i18n/faq/de.json";
import fr from "@/lib/i18n/faq/fr.json";
import es from "@/lib/i18n/faq/es.json";
import bg from "@/lib/i18n/faq/bg.json";
import el from "@/lib/i18n/faq/el.json";
import zh from "@/lib/i18n/faq/zh.json";
import ru from "@/lib/i18n/faq/ru.json";

export type FaqEnTranslation = { question: string; answer: string };

type FaqPack = Record<string, FaqEnTranslation>;

/** @deprecated Use locale packs via localizeFaqContent; kept for any direct EN lookups. */
export const faqEnBySlug: FaqPack = en as FaqPack;

const FAQ_PACKS: Partial<Record<AppLocale, FaqPack>> = {
  en: en as FaqPack,
  de: de as FaqPack,
  fr: fr as FaqPack,
  es: es as FaqPack,
  bg: bg as FaqPack,
  el: el as FaqPack,
  zh: zh as FaqPack,
  ru: ru as FaqPack,
};

export function localizeFaqContent(
  slug: string | undefined | null,
  question: string,
  answer: string,
  locale: string
): { question: string; answer: string } {
  if (locale === "tr" || !slug) return { question, answer };
  const pack = FAQ_PACKS[locale as AppLocale] ?? FAQ_PACKS.en;
  const hit = pack?.[slug] ?? FAQ_PACKS.en?.[slug];
  return hit ?? { question, answer };
}
