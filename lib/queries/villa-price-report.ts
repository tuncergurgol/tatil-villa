import { prisma } from "@/lib/db";
import { includesSearchText } from "@/lib/search-text";
import type { VillaListFilters } from "@/lib/villa-list-filters";
import {
  buildVillaPriceReportFilename,
  buildVillaPriceReportRows,
  type VillaPriceReportPeriodInput,
  type VillaPriceReportVillaInput,
} from "@/lib/villa-price-report";

type RegionWithParents = {
  name: string;
  slug: string;
  parent: {
    name: string;
    slug: string;
    parent: { name: string; slug: string } | null;
  } | null;
};

function buildRegionLabel(region: RegionWithParents) {
  const parts = [
    region.parent?.parent?.name,
    region.parent?.name,
    region.name,
  ].filter(Boolean);

  return parts.join(" / ");
}

function getRegionPathSlugs(region: RegionWithParents): string[] {
  const slugs = [region.slug];
  if (region.parent) {
    slugs.push(region.parent.slug);
    if (region.parent.parent) {
      slugs.push(region.parent.parent.slug);
    }
  }
  return slugs;
}

function matchesRegionFilter(
  region: RegionWithParents,
  selectedSlugs: string[]
) {
  if (selectedSlugs.length === 0) return true;
  const pathSlugs = getRegionPathSlugs(region);
  return pathSlugs.some((slug) => selectedSlugs.includes(slug));
}

function matchesVillaSearch(
  villa: { name: string; originalName: string; documentNo: string },
  query: string
) {
  if (!query.trim()) return true;

  return [villa.name, villa.originalName, villa.documentNo].some((value) =>
    includesSearchText(value ?? "", query)
  );
}

function mapPeriod(
  period: Awaited<
    ReturnType<typeof prisma.villaPricePeriod.findMany>
  >[number]
): VillaPriceReportPeriodInput {
  return {
    availability: period.availability,
    startDate: period.startDate,
    endDate: period.endDate,
    nightlyPrice: period.nightlyPrice,
    nightlyPriceCurrency: period.nightlyPriceCurrency,
    weeklyPrice: period.weeklyPrice,
    commissionRate: period.commissionRate,
    prepaymentRate: period.prepaymentRate,
    minStayNights: period.minStayNights,
    cleaningDayCount: period.cleaningDayCount,
    nightlyPriceWithoutCommission: period.nightlyPriceWithoutCommission,
    extraBedFee: period.extraBedFee,
    extraBedFeeCurrency: period.extraBedFeeCurrency,
    cleaningFee: period.cleaningFee,
    cleaningFeeCurrency: period.cleaningFeeCurrency,
    petCleaningFee: period.petCleaningFee,
    petCleaningFeeCurrency: period.petCleaningFeeCurrency,
    underfloorHeatingFee: period.underfloorHeatingFee,
    underfloorHeatingFeeCurrency: period.underfloorHeatingFeeCurrency,
    damageDeposit: period.damageDeposit,
    damageDepositCurrency: period.damageDepositCurrency,
    petDamageDeposit: period.petDamageDeposit,
    petDamageDepositCurrency: period.petDamageDepositCurrency,
  };
}

export async function generateVillaPriceReportExport(filters: VillaListFilters) {
  const villas = await prisma.villa.findMany({
    select: {
      id: true,
      villaId: true,
      name: true,
      originalName: true,
      documentNo: true,
      active: true,
      category: true,
      region: {
        select: {
          name: true,
          slug: true,
          parent: {
            select: {
              name: true,
              slug: true,
              parent: { select: { name: true, slug: true } },
            },
          },
        },
      },
      pricePeriods: {
        orderBy: [{ startDate: "asc" }],
      },
    },
    orderBy: [{ name: "asc" }],
  });

  const filtered = villas.filter((villa) => {
    if (filters.status === "active" && !villa.active) return false;
    if (filters.status === "passive" && villa.active) return false;
    if (filters.type !== "all" && villa.category !== filters.type) return false;
    if (!matchesRegionFilter(villa.region, filters.regions)) return false;
    if (!matchesVillaSearch(villa, filters.q)) return false;
    return true;
  });

  const reportVillas: VillaPriceReportVillaInput[] = filtered.map((villa) => ({
    active: villa.active,
    villaId: villa.villaId,
    name: villa.name,
    regionLabel: buildRegionLabel(villa.region),
    periods: villa.pricePeriods.map(mapPeriod),
  }));

  const rows = buildVillaPriceReportRows(reportVillas);

  return {
    rows,
    filename: buildVillaPriceReportFilename(),
    villaCount: reportVillas.length,
    rowCount: Math.max(0, rows.length - 1),
  };
}
