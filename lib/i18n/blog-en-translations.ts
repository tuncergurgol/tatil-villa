import type { AppLocale } from "@/i18n/routing";
import en from "@/lib/i18n/blog/en.json";
import de from "@/lib/i18n/blog/de.json";
import fr from "@/lib/i18n/blog/fr.json";
import es from "@/lib/i18n/blog/es.json";
import bg from "@/lib/i18n/blog/bg.json";
import el from "@/lib/i18n/blog/el.json";
import zh from "@/lib/i18n/blog/zh.json";
import ru from "@/lib/i18n/blog/ru.json";

export type BlogEnTranslation = { title: string; excerpt: string };

type BlogPack = Record<string, BlogEnTranslation>;

/** @deprecated Use locale packs via localizeBlogCard; kept for any direct EN lookups. */
export const blogEnBySlug: BlogPack = en as BlogPack;

const BLOG_PACKS: Partial<Record<AppLocale, BlogPack>> = {
  en: en as BlogPack,
  de: de as BlogPack,
  fr: fr as BlogPack,
  es: es as BlogPack,
  bg: bg as BlogPack,
  el: el as BlogPack,
  zh: zh as BlogPack,
  ru: ru as BlogPack,
};

export function localizeBlogCard(
  slug: string,
  title: string,
  excerpt: string,
  locale: string
): { title: string; excerpt: string } {
  if (locale === "tr") return { title, excerpt };
  const pack = BLOG_PACKS[locale as AppLocale] ?? BLOG_PACKS.en;
  const hit = pack?.[slug] ?? BLOG_PACKS.en?.[slug];
  return hit ?? { title, excerpt };
}
