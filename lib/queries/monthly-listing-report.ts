import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  buildMonthDateRange,
  formatAgencyLabel,
  formatListingUrl,
  type MonthlyListingReportRow,
} from "@/lib/monthly-listing-report";

export async function getMonthlyListingReportData(year: number, month: number) {
  const [companySettings, villas] = await Promise.all([
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
  ]);

  const agencyLabel = formatAgencyLabel({
    tursabNo: companySettings.tursabNo,
    agencyName: companySettings.agencyName,
  });
  const listingDateRange = buildMonthDateRange(year, month);
  const domain =
    companySettings.domain.trim() ||
    companySettings.brandName.trim() ||
    "www.tatildeyiz.com.tr";

  const rows: MonthlyListingReportRow[] = villas.map((villa) => ({
    agencyLabel,
    listingDateRange,
    listingNumber: "",
    listingUrl: formatListingUrl(domain, villa.slug),
    listingOwner: villa.documentOwnerName.trim() || "-",
    listingAddress:
      villa.documentAddress.trim() || villa.location.trim() || "-",
    housingPermitNo: villa.documentNo.trim(),
    listingFee: "",
  }));

  return {
    year,
    month,
    agencyLabel,
    listingDateRange,
    rows,
  };
}
