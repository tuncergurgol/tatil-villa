import { prisma } from "../lib/db";
import {
  fetchAirbnbCalendarStays,
  summarizeAirbnbCalendar,
} from "../lib/airbnb-calendar-scrape";
import { dbDateToDateKey } from "../lib/villa-period-calendar";

const URL = "https://www.airbnb.com.tr/rooms/28117950";

async function main() {
  const villa = await prisma.villa.findFirst({
    where: { slug: "villa-antik-bodrum" },
    select: {
      id: true,
      villaId: true,
      name: true,
      externalSyncUrl1: true,
      externalSyncLastMessage1: true,
    },
  });

  if (!villa) throw new Error("Villa bulunamadı");

  console.log("Villa:", villa);

  const { days, stays } = await fetchAirbnbCalendarStays(URL);
  console.log("Airbnb summary:", summarizeAirbnbCalendar(days));
  console.log("Airbnb stays:", stays);

  const periodCount = await prisma.villaPricePeriodDay.count({
    where: { villaId: villa.id },
  });
  const minMax = await prisma.villaPricePeriodDay.aggregate({
    where: { villaId: villa.id },
    _min: { date: true },
    _max: { date: true },
  });
  const bookedCount = await prisma.villaPricePeriodDay.count({
    where: { villaId: villa.id, occupancyStatus: { not: "EMPTY" } },
  });
  console.log("All period days:", { periodCount, minMax, bookedCount });

  const periodDays = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId: villa.id,
      date: { gte: new Date("2026-08-01T00:00:00.000Z"), lte: new Date("2026-09-30T00:00:00.000Z") },
    },
    select: { date: true, occupancyStatus: true, nightlyPrice: true },
    orderBy: { date: "asc" },
  });
  const nonEmpty = periodDays.filter((day) => day.occupancyStatus !== "EMPTY");
  console.log(
    `Aug-Sep days: total=${periodDays.length}, non-empty=${nonEmpty.length}`
  );
  console.log(
    "non-empty sample:",
    nonEmpty.slice(0, 30).map((day) => ({
      date: dbDateToDateKey(day.date),
      status: day.occupancyStatus,
    }))
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
