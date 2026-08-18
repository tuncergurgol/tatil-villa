import type { MetadataRoute } from "next";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { canonicalOriginFromDomain } from "@/lib/search-discovery";
import { buildPublicSitemap } from "@/lib/public-sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getCompanySettings();
  const site = await getPublicSiteProfile(settings);
  const origin = canonicalOriginFromDomain(site.domain);
  return buildPublicSitemap(site.key, origin);
}
