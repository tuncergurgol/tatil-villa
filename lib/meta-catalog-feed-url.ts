import {
  PUBLIC_SITE_KEYS,
  PUBLIC_SITE_META,
  type PublicSiteKey,
} from "@/lib/public-site-keys";

export type MetaCatalogFeedUrlRow = {
  siteKey: PublicSiteKey;
  label: string;
  url: string;
};

export function buildMetaCatalogFeedUrl(
  domain: string,
  siteKey?: PublicSiteKey
): string {
  const cleaned = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  const origin = `https://${cleaned || "www.tatildeyiz.com.tr"}`;
  // Meta Scheduled Feed URL doğrulayıcısı query token ile JSON 401 dönebiliyor;
  // domain bazlı herkese açık XML kullanılır (içerik zaten public sitede).
  void siteKey;
  return `${origin}/feeds/meta-catalog.xml`;
}

export function getMetaCatalogFeedUrls(): MetaCatalogFeedUrlRow[] {
  return PUBLIC_SITE_KEYS.map((siteKey) => ({
    siteKey,
    label: PUBLIC_SITE_META[siteKey].label,
    url: buildMetaCatalogFeedUrl(PUBLIC_SITE_META[siteKey].domain, siteKey),
  }));
}
