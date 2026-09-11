import { NextResponse } from "next/server";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { getPublicIndexablePages } from "@/lib/public-sitemap";
import {
  buildLlmsFullTxt,
  canonicalOriginFromDomain,
} from "@/lib/search-discovery";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getCompanySettings();
  const site = await getPublicSiteProfile(settings);
  const origin = canonicalOriginFromDomain(site.domain);
  const pages = await getPublicIndexablePages(site.key, origin);
  const body = buildLlmsFullTxt({
    origin,
    brandName: site.brandName,
    description: site.seoDescription,
    pages: pages.map((page) => ({ title: page.title, url: page.url })),
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
