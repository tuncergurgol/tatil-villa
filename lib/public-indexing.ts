import { defaultLocale, locales } from "@/i18n/routing";
import { stripDefaultLocalePrefix } from "@/lib/i18n/path";

const FOREIGN_LOCALES = locales.filter((locale) => locale !== defaultLocale);

/** /en, /de, /fr, /es, /bg, /el, /zh (as-needed prefix). */
export const FOREIGN_LOCALE_PATH_RE = new RegExp(
  `^/(?:${FOREIGN_LOCALES.join("|")})(?:/|$)`
);

export const INDEX_FOLLOW = {
  index: true,
  follow: true,
} as const;

export const NOINDEX_FOLLOW = {
  index: false,
  follow: true,
} as const;

export function isForeignLocalePath(pathname: string): boolean {
  return FOREIGN_LOCALE_PATH_RE.test(pathname);
}

export function isIndexableLocale(locale: string | null | undefined): boolean {
  return !locale || locale === defaultLocale;
}

export function hasNonEmptySearchParams(
  params: Record<string, string | string[] | undefined>
): boolean {
  return Object.values(params).some((value) => {
    if (value == null) return false;
    if (Array.isArray(value)) {
      return value.some((item) => String(item).trim() !== "");
    }
    return String(value).trim() !== "";
  });
}

/**
 * Google'ın tarayıp dizine eklemediği kopyalar:
 * - Dil önekli sayfalar (içerik Türkçe canonical'da)
 * - /villalar?filtre... (faceted / sonsuz kombinasyon)
 */
export function shouldNoindexPublicUrl(
  pathname: string,
  search: string | URLSearchParams = ""
): boolean {
  if (isForeignLocalePath(pathname)) return true;

  const path = stripDefaultLocalePrefix(pathname);
  if (path !== "/villalar") return false;

  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  return [...params.keys()].some((key) => {
    const value = params.get(key);
    return value != null && value.trim() !== "";
  });
}

export function publicIndexingRobots(indexable: boolean) {
  return indexable ? INDEX_FOLLOW : NOINDEX_FOLLOW;
}
