import { prisma } from "@/lib/db";
import { parseVillaRouteParam } from "@/lib/villa-admin-path";
import { getVillaShowcaseImage } from "@/lib/villa-gallery";
import type { VillaPeriodCurrency } from "@prisma/client";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import type { VillaPricePeriodDayItem } from "@/lib/villa-period-days";
import { getVillaPeriodPageData } from "@/lib/queries/villa-periods";

export type VillaTakvimSearchItem = {
  id: string;
  villaId: number | null;
  slug: string;
  name: string;
  originalName: string;
  documentNo: string;
  image: string;
  active: boolean;
  periodCount: number;
  displayPrice: number | null;
  displayPriceCurrency: VillaPeriodCurrency;
};

function resolveDisplayPrice(
  nightlyPrice: number | null,
  discountedNightlyPrice: number | null,
  fallbackPrice: number | null
): number | null {
  const candidates = [discountedNightlyPrice, nightlyPrice, fallbackPrice].filter(
    (value): value is number => value != null && value > 0
  );
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

export async function getVillaTakvimSearchOptions() {
  const [villas, periodStats] = await Promise.all([
    prisma.villa.findMany({
      select: {
        id: true,
        villaId: true,
        slug: true,
        name: true,
        originalName: true,
        documentNo: true,
        image: true,
        images: true,
        active: true,
        pricePerNight: true,
        _count: {
          select: { pricePeriods: true },
        },
      },
      orderBy: [{ villaId: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    }),
    prisma.villaPricePeriod.groupBy({
      by: ["villaId"],
      _min: {
        nightlyPrice: true,
        discountedNightlyPrice: true,
      },
    }),
  ]);

  const priceByVillaId = new Map(
    periodStats.map((item) => [
      item.villaId,
      {
        nightlyPrice: item._min.nightlyPrice,
        discountedNightlyPrice: item._min.discountedNightlyPrice,
      },
    ])
  );

  return villas.map((villa) => {
    const prices = priceByVillaId.get(villa.id);
    const displayPrice = resolveDisplayPrice(
      prices?.nightlyPrice ?? null,
      prices?.discountedNightlyPrice ?? null,
      villa.pricePerNight
    );

    return {
      id: villa.id,
      villaId: villa.villaId,
      slug: villa.slug,
      name: villa.name,
      originalName: villa.originalName,
      documentNo: villa.documentNo,
      image: getVillaShowcaseImage(villa),
      active: villa.active,
      periodCount: villa._count.pricePeriods,
      displayPrice,
      displayPriceCurrency: "TL" as VillaPeriodCurrency,
    };
  });
}

async function resolveVillaTakvimInternalId(routeParam: string) {
  const parsed = parseVillaRouteParam(routeParam);

  if (parsed.kind === "villaId") {
    const villa = await prisma.villa.findFirst({
      where: { villaId: parsed.value },
      select: { id: true },
    });
    return villa?.id ?? null;
  }

  const villa = await prisma.villa.findUnique({
    where: { id: routeParam },
    select: { id: true },
  });
  return villa?.id ?? null;
}

export async function getVillaTakvimPageData(routeParam?: string) {
  const villas = await getVillaTakvimSearchOptions();

  if (!routeParam) {
    return { villas, selected: null };
  }

  const internalId = await resolveVillaTakvimInternalId(routeParam);
  const periodData = internalId ? await getVillaPeriodPageData(internalId) : null;

  if (!periodData) {
    return { villas, selected: null };
  }

  const villaSummary =
    villas.find((villa) => villa.id === periodData.villa.id) ?? {
      ...periodData.villa,
      image: "",
      active: true,
      periodCount: periodData.periods.length,
      displayPrice: null,
      displayPriceCurrency: "TL" as VillaPeriodCurrency,
    };

  return {
    villas,
    selected: {
      villa: villaSummary,
      periods: periodData.periods,
      periodDays: periodData.periodDays,
    },
  };
}

export type VillaTakvimSelectedData = {
  villa: VillaTakvimSearchItem;
  periods: VillaPricePeriodItem[];
  periodDays: VillaPricePeriodDayItem[];
} | null;
