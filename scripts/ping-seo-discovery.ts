/**
 * Öncelikli SEO URL'lerini IndexNow + Yandex sitemap ping ile bildirir.
 * Çalıştır: npx tsx scripts/ping-seo-discovery.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPublicSiteMeta, listPublicSiteKeys } from "../lib/public-site-keys";
import {
  canonicalOriginFromDomain,
  createIndexNowKey,
  indexNowKeyLocation,
  pingYandexSitemap,
  submitIndexNowUrls,
} from "../lib/search-discovery";
import { SEO_GUIDE_REGION_SLUGS } from "../lib/seo-matrix";
import { SEO_TEMA_SLUGS } from "../lib/seo-topic-guides";
import { EARLY_BOOKING_PRICE_YEAR } from "../lib/home-campaigns";

function loadEnv() {
  if (process.env.DATABASE_URL?.trim()) return;
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const i = trimmed.indexOf("=");
      const key = trimmed.slice(0, i).trim();
      let value = trimmed.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* local .env optional on server if already exported */
  }
}

function priorityPaths(): string[] {
  const facilities = [
    "balayi-villalari",
    "isitmali-havuzlu-villalar",
    "deniz-manzarali-villalar",
    "ozel-havuzlu-villalar",
    "muhafazakar-villalar",
  ];
  const paths = [
    "/blog",
    "/blog/yazilar",
    "/blog/kalkan-gezilecek-yerler-ve-plajlar",
    `/kampanyalar/${EARLY_BOOKING_PRICE_YEAR}-erken-rezervasyon`,
    ...SEO_TEMA_SLUGS.map((slug) => `/tema/${slug}`),
    ...SEO_GUIDE_REGION_SLUGS.map((slug) => `/gezi-rehberi/${slug}`),
    ...facilities.map((slug) => `/kategori/${slug}`),
    ...["kalkan", "kas", "fethiye"].flatMap((region) =>
      facilities.slice(0, 4).map((f) => `/kategori/${region}-${f}`)
    ),
  ];
  return [...new Set(paths)];
}

async function main() {
  loadEnv();
  const paths = priorityPaths();
  const results = [];

  for (const siteKey of listPublicSiteKeys()) {
    const domain = getPublicSiteMeta(siteKey).domain;
    const origin = canonicalOriginFromDomain(domain);
    const host = domain.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    const key = createIndexNowKey(domain);
    const urls = paths.map((path) => `${origin}${path}`);
    const submitted = await submitIndexNowUrls({
      host,
      key,
      keyLocation: indexNowKeyLocation(origin),
      urls,
    });
    const yandex = await pingYandexSitemap(`${origin}/sitemap.xml`);
    results.push({
      siteKey,
      host,
      urls: urls.length,
      ...submitted,
      yandex: yandex.status,
    });
    console.log(
      `${siteKey}: indexnow ok=${submitted.ok} status=${submitted.status} n=${submitted.submitted} yandex=${yandex.status}`
    );
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error("Bazı sitelerde IndexNow başarısız:", failed);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
