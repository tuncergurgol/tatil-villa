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
  const params = new URLSearchParams();
  const token = process.env.META_CATALOG_FEED_SECRET?.trim();
  if (token) params.set("token", token);
  if (siteKey) params.set("site", siteKey);
  const query = params.toString();
  return `${origin}/feeds/meta-catalog.xml${query ? `?${query}` : ""}`;
}

export function getMetaCatalogFeedUrls(): MetaCatalogFeedUrlRow[] {
  return PUBLIC_SITE_KEYS.map((siteKey) => ({
    siteKey,
    label: PUBLIC_SITE_META[siteKey].label,
    url: buildMetaCatalogFeedUrl(PUBLIC_SITE_META[siteKey].domain, siteKey),
  }));
}
