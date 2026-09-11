import { prisma } from "../lib/db";
import { dateKeyToDbDate, dbDateToDateKey } from "../lib/villa-period-calendar";
import { applyVillaPeriodDaysOccupancy } from "../lib/villa-occupancy-service";
import { buildBookedOccupancyForStay } from "../lib/villa-period-selection";

async function main() {
  const villa = await prisma.villa.findFirst({
    where: { slug: "villa-antik-bodrum" },
    select: { id: true },
  });
  if (!villa) throw new Error("no villa");

  const testKey = "2026-08-12";
  const dbDate = dateKeyToDbDate(testKey);
  const row = await prisma.villaPricePeriodDay.findFirst({
    where: { villaId: villa.id, date: dbDate },
    select: { date: true, occupancyStatus: true, villaId: true },
  });
  console.log("lookup", { testKey, dbDate, row: row ? { ...row, date: dbDateToDateKey(row.date) } : null });

  const map = buildBookedOccupancyForStay("2026-08-01", "2026-08-13");
  console.log("expected occupancy sample:", [...map.entries()].slice(0, 15));

  const result = await applyVillaPeriodDaysOccupancy(
    villa.id,
    "2026-08-01",
    "2026-08-13",
    "BOOKED"
  );
  console.log("apply result", result);

  const after = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId: villa.id,
      date: {
        gte: dateKeyToDbDate("2026-08-01"),
        lte: dateKeyToDbDate("2026-08-15"),
      },
    },
    select: { date: true, occupancyStatus: true },
    orderBy: { date: "asc" },
  });
  console.log(
    "after apply:",
    after.map((d) => ({ date: dbDateToDateKey(d.date), status: d.occupancyStatus }))
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
