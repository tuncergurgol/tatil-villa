import { prisma } from "@/lib/db";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import type { VillaPricePeriodDayItem } from "@/lib/villa-period-days";
import {
  toVillaPriceDiscountItem,
} from "@/lib/villa-price-discount";

export async function getVillaPeriodPageData(villaId: string) {
  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: {
      id: true,
      villaId: true,
      slug: true,
      name: true,
      originalName: true,
      documentNo: true,
    },
  });

  if (!villa) return null;

  const [periods, periodDays, priceDiscounts] = await Promise.all([
    prisma.villaPricePeriod.findMany({
      where: { villaId },
      orderBy: [{ startDate: "asc" }],
    }),
    prisma.villaPricePeriodDay.findMany({
      where: { villaId },
      orderBy: [{ date: "asc" }],
      select: {
        id: true,
        periodId: true,
        villaId: true,
        date: true,
        availability: true,
        nightlyPrice: true,
        nightlyPriceCurrency: true,
        nightlyPriceWithoutCommission: true,
        discountedNightlyPrice: true,
        occupancyStatus: true,
        occupancyCheckIn: true,
      },
    }),
    prisma.villaPriceDiscount.findMany({
      where: { villaId },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  return {
    villa,
    periods: periods as VillaPricePeriodItem[],
    periodDays: periodDays as VillaPricePeriodDayItem[],
    priceDiscounts: priceDiscounts.map(toVillaPriceDiscountItem),
  };
}
