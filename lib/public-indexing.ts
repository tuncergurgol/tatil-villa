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

const NOINDEX_PATH_PREFIXES = [
  "/uye",
  "/onay",
  "/rezervasyon-onay",
  "/giris-bilgilendirme",
  "/rezervasyon-dogrulama",
  "/odemeyonlendir",
  "/yorum-yaz",
];

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

function toSearchParams(
  search: string | URLSearchParams | Record<string, string | string[] | undefined>
): URLSearchParams {
  if (search instanceof URLSearchParams) return search;
  if (typeof search === "string") {
    return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (String(item).trim()) params.append(key, String(item));
      }
      continue;
    }
    if (String(value).trim()) params.set(key, String(value));
  }
  return params;
}

function filledSearchEntries(params: URLSearchParams): Array<[string, string]> {
  return [...params.entries()].filter(([, value]) => value.trim() !== "");
}

/** Yalnızca bölge (ve isteğe bağlı page=1) — indekslemeye değer kopyasız URL. */
export function isIndexableVillaSearch(
  search:
    | string
    | URLSearchParams
    | Record<string, string | string[] | undefined> = ""
): boolean {
  const params = toSearchParams(search);
  const entries = filledSearchEntries(params);
  if (entries.length === 0) return true;

  const keys = new Set(entries.map(([key]) => key));
  const region = params.get("region")?.trim() || "";
  if (!region || !keys.has("region")) return false;

  if (keys.size === 1) return true;
  const page = params.get("page")?.trim() || "";
  return keys.size === 2 && keys.has("page") && (page === "" || page === "1");
}

export function villaSearchCanonicalPath(
  search:
    | string
    | URLSearchParams
    | Record<string, string | string[] | undefined> = ""
): string {
  const params = toSearchParams(search);
  const region = params.get("region")?.trim() || "";
  if (region && isIndexableVillaSearch(params)) {
    return `/villalar?region=${encodeURIComponent(region)}`;
  }
  return "/villalar";
}

export function canonicalPublicPath(
  pathname: string,
  search: string | URLSearchParams = ""
): string {
  const path = stripDefaultLocalePrefix(pathname) || "/";
  if (path === "/villalar") return villaSearchCanonicalPath(search);
  if (path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

/**
 * Google'ın tarayıp dizine eklemediği kopyalar:
 * - Dil önekli sayfalar (içerik Türkçe canonical'da)
 * - Üye / ödeme / özel token URL'leri
 * - /villalar?filtre... (faceted / sonsuz kombinasyon)
 * - Yalnızca ?region= slugu indekslenir
 */
export function shouldNoindexPublicUrl(
  pathname: string,
  search: string | URLSearchParams = ""
): boolean {
  if (isForeignLocalePath(pathname)) return true;

  const path = stripDefaultLocalePrefix(pathname);
  if (
    NOINDEX_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    )
  ) {
    return true;
  }

  if (path !== "/villalar") return false;
  return !isIndexableVillaSearch(search);
}

export function publicIndexingRobots(indexable: boolean) {
  return indexable ? INDEX_FOLLOW : NOINDEX_FOLLOW;
}
