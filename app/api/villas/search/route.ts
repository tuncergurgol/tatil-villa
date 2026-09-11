import { NextRequest, NextResponse } from "next/server";
import { searchActiveVillasByName } from "@/lib/queries/villa-name-search";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const results = await searchActiveVillasByName(q, 12, site.key);
  return NextResponse.json({ results });
}
