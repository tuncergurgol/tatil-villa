/**
 * Meta katalog feed önbelleğini ısıtır (deploy / cron).
 * Çalıştır: npx tsx scripts/warm-meta-catalog-feed.ts
 */
import { warmMetaCatalogFeedCache } from "../lib/meta-catalog-feed-cache";
import {
  PUBLIC_SITE_KEYS,
  PUBLIC_SITE_META,
  type PublicSiteKey,
} from "../lib/public-site-keys";
import type { PublicSiteProfile } from "../lib/public-site-profile";

const BRAND_NAMES: Record<PublicSiteKey, string> = {
  tatildeyiz: "Tatildeyiz",
  "balayi-villacisi": "Balayı Villacısı",
  "tatil-villacisi": "Tatil Villacısı",
};

function minimalSiteProfile(siteKey: PublicSiteKey): PublicSiteProfile {
  const meta = PUBLIC_SITE_META[siteKey];
  return {
    key: siteKey,
    domain: meta.domain,
    brandName: BRAND_NAMES[siteKey],
    logoUrl: "",
    faviconUrl: "",
    ogImageUrl: "",
    seoTitle: "",
    seoDescription: "",
    heroTitle: "",
    heroImageUrl: "",
    useDefaultLogo: siteKey === "tatildeyiz",
  };
}

async function main() {
  for (const siteKey of PUBLIC_SITE_KEYS) {
    const site = minimalSiteProfile(siteKey);
    const result = await warmMetaCatalogFeedCache(site);
    console.log(
      `[warm-meta-catalog-feed] ${result.siteKey}: ${result.itemHint} item, ${result.bytes} bytes${result.r2Url ? `, r2=${result.r2Url}` : ""}`
    );
  }
}

main().catch((error) => {
  console.error("[warm-meta-catalog-feed] failed", error);
  process.exit(1);
});
