import { prisma } from "@/lib/db";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import type { VillaPricePeriodDayItem } from "@/lib/villa-period-days";
import { getVillaPeriodPageData } from "@/lib/queries/villa-periods";

export type VillaTakvimSearchItem = {
  id: string;
  slug: string;
  name: string;
  originalName: string;
  documentNo: string;
};

export async function getVillaTakvimSearchOptions() {
  return prisma.villa.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      originalName: true,
      documentNo: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getVillaTakvimPageData(villaId?: string) {
  const villas = await getVillaTakvimSearchOptions();
  const selected = villaId ? await getVillaPeriodPageData(villaId) : null;

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
