import { NextResponse } from "next/server";
import { buildMetaCatalogFeedXml } from "@/lib/meta-catalog-feed";
import {
  getPublicSiteProfileByKey,
  getRequestHostname,
  resolvePublicSiteProfile,
} from "@/lib/public-site-profile";
import { isPublicSiteKey } from "@/lib/public-site-keys";
import { getCompanySettings } from "@/lib/queries/company-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const settings = await getCompanySettings();
    const siteParam = new URL(request.url).searchParams.get("site")?.trim();
    const envSite = process.env.META_CATALOG_SITE_KEY?.trim();
    const hostname = await getRequestHostname();

    const site =
      siteParam && isPublicSiteKey(siteParam)
        ? getPublicSiteProfileByKey(settings, siteParam)
        : envSite && isPublicSiteKey(envSite)
          ? getPublicSiteProfileByKey(settings, envSite)
          : await resolvePublicSiteProfile(settings, hostname);

    const xml = await buildMetaCatalogFeedXml(site);

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": "inline; filename=meta-catalog.xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("[meta-catalog-feed]", error);
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Feed Error</title></channel></rss>`;
    return new NextResponse(errorXml, {
      status: 500,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  }
}
