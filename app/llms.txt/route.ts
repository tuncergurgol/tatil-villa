import { NextResponse } from "next/server";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { prisma } from "@/lib/db";
import { resolvePublicSiteVillaFilter } from "@/lib/public-villa-site-filter";
import {
  buildLlmsTxt,
  canonicalOriginFromDomain,
} from "@/lib/search-discovery";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getCompanySettings();
  const site = await getPublicSiteProfile(settings);
  const origin = canonicalOriginFromDomain(site.domain);
  const villaWhere = await resolvePublicSiteVillaFilter(
    { active: true, showInSearch: true },
    site.key
  );
  const villaCount = await prisma.villa.count({ where: villaWhere });
  const body = buildLlmsTxt({
    origin,
    brandName: site.brandName,
    description: site.seoDescription,
    villaCount,
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
