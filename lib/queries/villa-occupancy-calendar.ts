import { prisma } from "@/lib/db";
import { dbDateToDateKey } from "@/lib/villa-period-calendar";

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function addMonthsUtc(date: Date, months: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
  );
}

export type VillaOccupancyCalendarDay = {
  date: string;
  occupancyStatus: string;
};

/**
 * Villa Detay doluluk takvimi ile aynı kaynak:
 * VillaPricePeriodDay.occupancyStatus (BOOKED / OPTION / EMPTY).
 */
export async function getVillaOccupancyCalendarDays(
  villaId: string,
  monthsAhead = 12
): Promise<VillaOccupancyCalendarDay[]> {
  if (!villaId) return [];

  const fromDate = startOfTodayUtc();
  const toDate = addMonthsUtc(fromDate, monthsAhead);

  const days = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId,
      date: { gte: fromDate, lt: toDate },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      occupancyStatus: true,
    },
  });

  return days.map((day) => ({
    date: dbDateToDateKey(day.date),
    occupancyStatus: day.occupancyStatus,
  }));
}
