/**
 * Meta katalog feed önbelleğini ısıtır (deploy / cron).
 * Çalıştır: npx tsx scripts/warm-meta-catalog-feed.ts
 */
import { PUBLIC_SITE_KEYS } from "../lib/public-site-keys";
import { warmMetaCatalogFeedCache } from "../lib/meta-catalog-feed-cache";
import { getPublicSiteProfileByKey } from "../lib/public-site-profile";
import { getCompanySettings } from "../lib/queries/company-settings";

async function main() {
  const settings = await getCompanySettings();

  for (const siteKey of PUBLIC_SITE_KEYS) {
    const site = getPublicSiteProfileByKey(settings, siteKey);
    const result = await warmMetaCatalogFeedCache(site);
    console.log(
      `[warm-meta-catalog-feed] ${result.siteKey}: ${result.itemHint} item, ${result.bytes} bytes`
    );
  }
}

main().catch((error) => {
  console.error("[warm-meta-catalog-feed] failed", error);
  process.exit(1);
});
