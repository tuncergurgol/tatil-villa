import { prisma } from "@/lib/db";
import { parseVillaRouteParam } from "@/lib/villa-admin-path";
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
};

export async function getVillaTakvimSearchOptions() {
  return prisma.villa.findMany({
    select: {
      id: true,
      villaId: true,
      slug: true,
      name: true,
      originalName: true,
      documentNo: true,
    },
    orderBy: { name: "asc" },
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
  const selected = internalId ? await getVillaPeriodPageData(internalId) : null;

  return {
    villas,
    selected,
  };
}

export type VillaTakvimSelectedData = {
  villa: VillaTakvimSearchItem;
  periods: VillaPricePeriodItem[];
  periodDays: VillaPricePeriodDayItem[];
} | null;
