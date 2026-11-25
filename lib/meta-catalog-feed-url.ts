import {
  getPublicSiteMeta,
  listPublicSiteKeys,
  type PublicSiteKey,
} from "@/lib/public-site-keys";
import { buildMetaCatalogFeedR2Url } from "@/lib/meta-catalog-feed-r2";

export type MetaCatalogFeedUrlRow = {
  siteKey: PublicSiteKey;
  label: string;
  url: string;
  siteUrl: string;
};

export function buildMetaCatalogSiteFeedUrl(domain: string): string {
  const cleaned = domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  const origin = `https://${cleaned || "www.tatildeyiz.com.tr"}`;
  return `${origin}/feeds/meta-catalog.xml`;
}

export function buildMetaCatalogFeedUrl(
  domain: string,
  siteKey?: PublicSiteKey
): string {
  if (siteKey) {
    const r2Url = buildMetaCatalogFeedR2Url(siteKey);
    if (r2Url) return r2Url;
  }
  return buildMetaCatalogSiteFeedUrl(domain);
}

export function getMetaCatalogFeedUrls(): MetaCatalogFeedUrlRow[] {
  return listPublicSiteKeys().map((siteKey) => ({
    siteKey,
    label: getPublicSiteMeta(siteKey).label,
    url: buildMetaCatalogFeedUrl(getPublicSiteMeta(siteKey).domain, siteKey),
    siteUrl: buildMetaCatalogSiteFeedUrl(getPublicSiteMeta(siteKey).domain),
  }));
}
