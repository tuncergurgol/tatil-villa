import { defaultLocale, locales, type AppLocale } from "@/i18n/routing";
import { localeToBcp47 } from "@/lib/i18n/locale-display";
import {
  canonicalPublicPath,
  localeFromPublicPath,
  shouldNoindexPublicUrl,
} from "@/lib/public-indexing";

/** Avrupa aramasında İngilizce sürüm, dil eşleşmezse yedek sayfadır. */
export const X_DEFAULT_LOCALE: AppLocale = "en";

export function openGraphLocale(locale: string): string {
  return localeToBcp47(locale).replace("-", "_");
}

/** Dil öneksiz yolu istenen dilin public adresine çevirir. Sorgu korunur. */
export function localePrefixedPublicPath(locale: string, barePath: string): string {
  const queryIndex = barePath.indexOf("?");
  const pathname = queryIndex === -1 ? barePath : barePath.slice(0, queryIndex);
  const search = queryIndex === -1 ? "" : barePath.slice(queryIndex);
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (!locale || locale === defaultLocale) return `${normalized}${search}`;
  const prefixed = normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
  return `${prefixed}${search}`;
}

function splitBarePath(barePath: string): { pathname: string; search: string } {
  const queryIndex = barePath.indexOf("?");
  if (queryIndex === -1) return { pathname: barePath || "/", search: "" };
  return {
    pathname: barePath.slice(0, queryIndex) || "/",
    search: barePath.slice(queryIndex + 1),
  };
}

/**
 * Self-canonical + hreflang. Yalnızca o dilde indekslenen sürümler listelenir.
 * x-default İngilizce sürümdür; o sayfa kapalıysa Türkçe sürüme düşer.
 */
export function buildPublicAlternates(
  locale: string,
  pathname: string,
  search: string | URLSearchParams = ""
): { canonical: string; languages: Record<string, string> } {
  let path = pathname;
  let query: string | URLSearchParams = search;
  const searchEmpty =
    typeof query === "string"
      ? query.trim() === ""
      : [...query.keys()].length === 0;
  if (searchEmpty) {
    const queryIndex = pathname.indexOf("?");
    if (queryIndex !== -1) {
      path = pathname.slice(0, queryIndex);
      query = pathname.slice(queryIndex + 1);
    }
  }
  const bare = canonicalPublicPath(path, query);
  const { pathname: barePath, search: bareSearch } = splitBarePath(bare);
  const languages: Record<string, string> = {};

  for (const item of locales) {
    const hrefPath = localePrefixedPublicPath(item, barePath);
    if (shouldNoindexPublicUrl(hrefPath, bareSearch)) continue;
    languages[localeToBcp47(item)] = localePrefixedPublicPath(item, bare);
  }

  const xDefault =
    languages[localeToBcp47(X_DEFAULT_LOCALE)] ??
    languages[localeToBcp47(defaultLocale)];
  if (xDefault) languages["x-default"] = xDefault;

  const requested = (locales as readonly string[]).includes(locale)
    ? locale
    : localeFromPublicPath(pathname);
  return {
    canonical: localePrefixedPublicPath(requested, bare),
    languages,
  };
}
