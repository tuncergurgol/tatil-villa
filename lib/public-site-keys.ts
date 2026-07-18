export const PUBLIC_SITE_KEYS = [
  "tatildeyiz",
  "balayi-villacisi",
  "tatil-villacisi",
] as const;

export type PublicSiteKey = (typeof PUBLIC_SITE_KEYS)[number];

export const PUBLIC_SITE_META: Record<
  PublicSiteKey,
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
  return (PUBLIC_SITE_KEYS as readonly string[]).includes(value);
}
