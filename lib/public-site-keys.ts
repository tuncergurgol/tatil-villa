export const PUBLIC_SITE_KEYS = [
  "tatildeyiz",
  "balayi-villacisi",
  "tatil-villacisi",
] as const;

export type BuiltInPublicSiteKey = (typeof PUBLIC_SITE_KEYS)[number];

/** Built-in 3 site + opsiyonel Site 4 (env). */
export type PublicSiteKey = BuiltInPublicSiteKey | string;

export const PUBLIC_SITE_META: Record<
  BuiltInPublicSiteKey,
  { domain: string; label: string }
> = {
  tatildeyiz: {
    domain: "www.tatildeyiz.com.tr",
    label: "Tatildeyiz",
  },
  "balayi-villacisi": {
    domain: "www.balayivillacisi.com",
    label: "Balayı Villacısı",
  },
  "tatil-villacisi": {
    domain: "www.tatilvillacisi.com",
    label: "Tatil Villacısı",
  },
};

function getSite4KeyFromEnv(): string {
  return (
    process.env.PUBLIC_SITE_4_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SITE_4_KEY?.trim() ||
    ""
  );
}

function getSite4DomainFromEnv(): string {
  return (
    process.env.PUBLIC_SITE_4_DOMAIN?.trim() ||
    process.env.NEXT_PUBLIC_SITE_4_DOMAIN?.trim() ||
    ""
  );
}

function getSite4BrandFromEnv(): string {
  return (
    process.env.PUBLIC_SITE_4_BRAND?.trim() ||
    process.env.NEXT_PUBLIC_SITE_4_BRAND?.trim() ||
    ""
  );
}

function getSite4FacilityCategoriesFromEnv(): string[] {
  const raw =
    process.env.PUBLIC_SITE_4_FACILITY_CATEGORIES?.trim() ||
    process.env.NEXT_PUBLIC_SITE_4_FACILITY_CATEGORIES?.trim() ||
    "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Bir public sitenin yalnızca belirli tesis kategorilerini yayınlaması için
 * whitelist. Boş liste = kategori kısıtı yok (tüm villalar yayınlanabilir).
 */
const PUBLIC_SITE_FACILITY_CATEGORIES: Record<string, string[]> = {
  "glamping-turkey": ["Bungalov", "Domes"],
};

/**
 * Site bazlı tesis kategorisi whitelist'i. Site 4 için env ile ezilebilir;
 * env yoksa yerleşik varsayılan kullanılır.
 */
export function getPublicSiteFacilityCategories(
  siteKey: PublicSiteKey | null | undefined
): string[] {
  if (!siteKey) return [];
  const site4Key = getSite4KeyFromEnv();
  if (site4Key && siteKey === site4Key) {
    const fromEnv = getSite4FacilityCategoriesFromEnv();
    if (fromEnv.length > 0) return fromEnv;
  }
  return PUBLIC_SITE_FACILITY_CATEGORIES[siteKey] ?? [];
}

export function isPublicSiteKey(value: string): value is PublicSiteKey {
  if ((PUBLIC_SITE_KEYS as readonly string[]).includes(value)) return true;
  const site4Key = getSite4KeyFromEnv();
  return Boolean(site4Key && site4Key === value);
}

export function listPublicSiteKeys(): PublicSiteKey[] {
  const keys: PublicSiteKey[] = [...PUBLIC_SITE_KEYS];
  const site4Key = getSite4KeyFromEnv();
  if (site4Key && /^[a-z0-9-]+$/i.test(site4Key) && !keys.includes(site4Key)) {
    keys.push(site4Key);
  }
  return keys;
}

export function getPublicSiteMeta(siteKey: PublicSiteKey): {
  domain: string;
  label: string;
} {
  if (siteKey in PUBLIC_SITE_META) {
    return PUBLIC_SITE_META[siteKey as BuiltInPublicSiteKey];
  }
  const site4Key = getSite4KeyFromEnv();
  const site4Domain = getSite4DomainFromEnv()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  const site4Brand = getSite4BrandFromEnv();
  if (site4Key && siteKey === site4Key && site4Domain && site4Brand) {
    const domain = site4Domain.startsWith("www.")
      ? site4Domain
      : `www.${site4Domain.replace(/^www\./i, "")}`;
    return { domain, label: site4Brand };
  }
  return PUBLIC_SITE_META.tatildeyiz;
}
