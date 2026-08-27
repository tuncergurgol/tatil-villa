import type { Metadata } from "next";
import EarlyBookingCampaignPageView from "@/components/campaigns/EarlyBookingCampaignPageView";
import { getVillaSearchResults } from "@/lib/queries/villas";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { parseVillaSearchPage } from "@/lib/villa-search-params";
import { EARLY_BOOKING_PRICE_YEAR } from "@/lib/home-campaigns";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "2027 Yılı Erken Rezervasyon Fırsatları",
  description:
    "2027 sezonu fiyatı açıklanan kiralık villalar. Erken rezervasyon ile istediğiniz tarihi şimdiden ayırtın.",
  alternates: { canonical: "/kampanyalar/2027-erken-rezervasyon" },
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function EarlyBookingCampaignPage({
  searchParams,
}: PageProps) {
  const query = await searchParams;
  const page = parseVillaSearchPage(query.page);
  const company = await getCompanySettings();
  const site = await getPublicSiteProfile(company);
  const { villas, totalCount, totalPages } = await getVillaSearchResults({
    priceYear: EARLY_BOOKING_PRICE_YEAR,
    sort: "recommended",
    page,
    pageSize: 12,
    siteKey: site.key,
  });

  return (
    <EarlyBookingCampaignPageView
      villas={villas}
      totalCount={totalCount}
      page={page}
      totalPages={totalPages}
    />
  );
}
