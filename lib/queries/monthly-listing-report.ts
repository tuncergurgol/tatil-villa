import { prisma } from "@/lib/db";
import { getAgencySitesForPicker } from "@/lib/queries/agency-sites";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  buildMonthDateRange,
  formatAgencyLabel,
  formatListingUrl,
  type MonthlyListingReportRow,
} from "@/lib/monthly-listing-report";

function defaultCompanyDomain(input: {
  domain: string;
  brandName: string;
}) {
  return (
    input.domain.trim() ||
    input.brandName.trim() ||
    "www.tatildeyiz.com.tr"
  );
}

export async function getMonthlyListingReportData(
  year: number,
  month: number,
  siteIds: string[] = []
) {
  const [companySettings, villas, agencySites] = await Promise.all([
    getCompanySettings(),
    prisma.villa.findMany({
      where: {
        showInSearch: true,
        documentNo: { not: "" },
      },
      select: {
        slug: true,
        documentNo: true,
        documentOwnerName: true,
        documentAddress: true,
        location: true,
        name: true,
      },
      orderBy: [{ name: "asc" }],
    }),
    getAgencySitesForPicker(),
  ]);

  const agencyLabel = formatAgencyLabel({
    tursabNo: companySettings.tursabNo,
    agencyName: companySettings.agencyName,
  });
  const listingDateRange = buildMonthDateRange(year, month);

  const selectedSiteIds = new Set(siteIds.filter(Boolean));
  const selectedSites =
    selectedSiteIds.size > 0
      ? agencySites.filter((site) => selectedSiteIds.has(site.id))
      : [];

  const siteTargets =
    selectedSites.length > 0
      ? selectedSites.map((site) => ({
          id: site.id,
          name: site.name,
          domain: site.domain,
        }))
      : [
          {
            id: "default",
            name: companySettings.brandName.trim() || "Varsayılan",
            domain: defaultCompanyDomain(companySettings),
          },
        ];

  const rows: MonthlyListingReportRow[] = siteTargets.flatMap((site) =>
    villas.map((villa) => ({
      agencyLabel,
      listingDateRange,
      listingNumber: "",
      listingUrl: formatListingUrl(site.domain, villa.slug),
      listingOwner: villa.documentOwnerName.trim() || "-",
      listingAddress:
        villa.documentAddress.trim() || villa.location.trim() || "-",
      housingPermitNo: villa.documentNo.trim(),
      listingFee: "",
      siteName: site.name,
    }))
  );

  return {
    year,
    month,
    agencyLabel,
    listingDateRange,
    rows,
    selectedSiteIds: selectedSites.map((site) => site.id),
  };
}
