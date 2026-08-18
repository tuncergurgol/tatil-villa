import { prisma } from "@/lib/db";
import {
  dbDateToDateKey,
  toDbDate,
} from "@/lib/villa-period-calendar";
import {
  hasActiveDiscount,
  resolveDayDiscountedPrice,
} from "@/lib/villa-period-pricing";

export type VillaPriceDiscountItem = {
  id: string;
  startDate: string;
  endDate: string;
  discount1Rate: number | null;
  discount2Rate: number | null;
  extraDiscountAmount: number | null;
};

export function toVillaPriceDiscountItem(row: {
  id: string;
  startDate: Date;
  endDate: Date;
  discount1Rate: number | null;
  discount2Rate: number | null;
  extraDiscountAmount: number | null;
}): VillaPriceDiscountItem {
  return {
    id: row.id,
    startDate: dbDateToDateKey(row.startDate),
    endDate: dbDateToDateKey(row.endDate),
    discount1Rate: row.discount1Rate,
    discount2Rate: row.discount2Rate,
    extraDiscountAmount: row.extraDiscountAmount,
  };
}

function isDateKeyCovered(
  dateKey: string,
  startKey: string,
  endKey: string
): boolean {
  return dateKey >= startKey && dateKey <= endKey;
}

export async function recomputeVillaDayDiscountsInRange(
  villaId: string,
  rangeStart: Date,
  rangeEnd: Date
) {
  const startKey = dbDateToDateKey(rangeStart);
  const endKey = dbDateToDateKey(rangeEnd);
  const dbStart = toDbDate(rangeStart);
  const dbEnd = toDbDate(rangeEnd);

  await prisma.$transaction(async (tx) => {
    const [days, discounts] = await Promise.all([
      tx.villaPricePeriodDay.findMany({
        where: {
          villaId,
          date: {
            gte: dbStart,
            lte: dbEnd,
          },
        },
        include: {
          period: {
            select: {
              discount1Rate: true,
              discount2Rate: true,
              extraDiscountAmount: true,
            },
          },
        },
      }),
      tx.villaPriceDiscount.findMany({
        where: {
          villaId,
          startDate: { lte: dbEnd },
          endDate: { gte: dbStart },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const discountRows = discounts.map((row) => ({
      ...row,
      startKey: dbDateToDateKey(row.startDate),
      endKey: dbDateToDateKey(row.endDate),
    }));

    for (const day of days) {
      const dateKey = dbDateToDateKey(day.date);
      if (dateKey < startKey || dateKey > endKey) continue;

      const covering = discountRows.filter((row) =>
        isDateKeyCovered(dateKey, row.startKey, row.endKey)
      );
      const source =
        covering.length > 0 ? covering[covering.length - 1] : day.period;

      const discount1Rate = source.discount1Rate;
      const discount2Rate = source.discount2Rate;
      const extraDiscountAmount = source.extraDiscountAmount;
      const discountedNightlyPrice = hasActiveDiscount({
        discount1Rate,
        discount2Rate,
        extraDiscountAmount,
      })
        ? resolveDayDiscountedPrice(
            day.nightlyPrice,
            discount1Rate,
            discount2Rate,
            extraDiscountAmount
          )
        : day.nightlyPrice;

      await tx.villaPricePeriodDay.update({
        where: { id: day.id },
        data: {
          discount1Rate,
          discount2Rate,
          extraDiscountAmount,
          discountedNightlyPrice,
        },
      });
    }
  });
}
