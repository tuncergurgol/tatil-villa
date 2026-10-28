import { defaultLocale, locales, type AppLocale } from "@/i18n/routing";
import { stripDefaultLocalePrefix, stripLocalePrefix } from "@/lib/i18n/path";

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
  if (!locale) return true;
  return (locales as readonly string[]).includes(locale);
}

/** Yabancı dilde gövdesi hâlâ yalnızca Türkçe olan bölümler. */
const FOREIGN_UNTRANSLATED_ROOTS = new Set([
  "kurumsal",
  "kampanyalar",
  "tur",
  "uye",
  "otel",
  "bilet",
  "arac-kiralama",
  "vip-transfer",
  "feribot",
  "sadakat",
  "yeni-otel",
  "onay",
  "rezervasyon",
  "rezervasyon-onay",
  "rezervasyon-dogrulama",
  "teklif",
  "yorum-yaz",
  "giris-bilgilendirme",
  "odemeyonlendir",
]);

export function unlocalizedPublicPath(pathname: string): string {
  const stripped = stripLocalePrefix(stripDefaultLocalePrefix(pathname)) || "/";
  const path = stripped.split("?")[0] || "/";
  return path.replace(/\/+$/, "") || "/";
}

export function localeFromPublicPath(pathname: string): AppLocale {
  const match = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  const code = match?.[1];
  if (code && (locales as readonly string[]).includes(code) && code !== defaultLocale) {
    return code as AppLocale;
  }
  return defaultLocale;
}

/**
 * Çevrilmiş kamu sayfaları her dilde indekslenir.
 * Yorum metinleri yalnızca Türkçe ve İngilizce olduğu için diğer dillerde kapalı kalır.
 * Kurumsal, kampanya ve operasyon sayfaları yabancı dilde noindex.
 */
export function isLocaleIndexablePublicPath(
  locale: string | null | undefined,
  pathname: string
): boolean {
  if (!locale || locale === defaultLocale) return true;
  const path = unlocalizedPublicPath(pathname);
  if (path === "/yorumlar") return locale === "en";
  const root = path.split("/").filter(Boolean)[0] ?? "";
  if (!root) return true;
  return !FOREIGN_UNTRANSLATED_ROOTS.has(root);
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

/** Dil öneksiz kanonik yol. Bölge listesi `?region=` taşır, diğer filtreler düşer. */
export function canonicalPublicPath(
  pathname: string,
  search: string | URLSearchParams = ""
): string {
  const path = unlocalizedPublicPath(pathname);
  if (path === "/villalar") return villaSearchCanonicalPath(search);
  if (path === "/") return "/";
  return path;
}

/**
 * Google'ın tarayıp dizine eklemediği kopyalar:
 * - Üye / ödeme / özel token URL'leri
 * - Çevrilmemiş yabancı dil sayfaları
 * - /villalar?filtre... (faceted / sonsuz kombinasyon)
 * - Yalnızca ?region= slugu indekslenir
 */
export function shouldNoindexPublicUrl(
  pathname: string,
  search: string | URLSearchParams = ""
): boolean {
  const path = unlocalizedPublicPath(pathname);
  const locale = localeFromPublicPath(pathname);
  if (!isLocaleIndexablePublicPath(locale, path)) return true;

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
