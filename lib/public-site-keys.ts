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

export function isPublicSiteKey(value: string): value is PublicSiteKey {
  if ((PUBLIC_SITE_KEYS as readonly string[]).includes(value)) return true;
  // Site 4 env key (runtime)
  const site4Key = process.env.PUBLIC_SITE_4_KEY?.trim();
  return Boolean(site4Key && site4Key === value);
}

export function listPublicSiteKeys(): PublicSiteKey[] {
  const keys: PublicSiteKey[] = [...PUBLIC_SITE_KEYS];
  const site4Key = process.env.PUBLIC_SITE_4_KEY?.trim();
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
  const site4Key = process.env.PUBLIC_SITE_4_KEY?.trim();
  const site4Domain = process.env.PUBLIC_SITE_4_DOMAIN?.trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  const site4Brand = process.env.PUBLIC_SITE_4_BRAND?.trim();
  if (site4Key && siteKey === site4Key && site4Domain && site4Brand) {
    const domain = site4Domain.startsWith("www.")
      ? site4Domain
      : `www.${site4Domain.replace(/^www\./i, "")}`;
    return { domain, label: site4Brand };
  }
  return PUBLIC_SITE_META.tatildeyiz;
}
