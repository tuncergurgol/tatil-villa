/**
 * Meta katalog feed önbelleğini ısıtır (deploy / cron).
 * Çalıştır: npx tsx scripts/warm-meta-catalog-feed.ts
 */
import { warmMetaCatalogFeedCache } from "../lib/meta-catalog-feed-cache";
import {
  getPublicSiteMeta,
  listPublicSiteKeys,
  type PublicSiteKey,
} from "../lib/public-site-keys";
import type { PublicSiteProfile } from "../lib/public-site-profile";

function minimalSiteProfile(siteKey: PublicSiteKey): PublicSiteProfile {
  const meta = getPublicSiteMeta(siteKey);
  return {
    key: siteKey,
    domain: meta.domain,
    brandName: meta.label,
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
  for (const siteKey of listPublicSiteKeys()) {
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
