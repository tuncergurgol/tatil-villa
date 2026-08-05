/**
 * Bungalov Masal 2 (villaId 1397): onaylı rezervasyon doluluklarını yeniden yazar.
 * Kapama (BOOKED) onaylı rezervasyonla çakıştığı için yalnızca RESERVED senkronu yapılır.
 * Çalıştır: npx tsx scripts/fix-villa-1397-august-occupancy.ts
 */
import { PrismaClient } from "@prisma/client";
import { applyVillaPeriodDaysOccupancy } from "../lib/villa-occupancy-service";
import { dateKeyToDbDate, dbDateToDateKey } from "../lib/villa-period-calendar";
import { resolveVillaDayVisualFromMap } from "../lib/villa-period-day-visual";
import { buildOccupancyMap } from "../lib/booking-calendar-selection";

const prisma = new PrismaClient();

async function main() {
  const villa = await prisma.villa.findFirst({
    where: { villaId: 1397 },
    select: { id: true, name: true },
  });
  if (!villa) throw new Error("Villa 1397 bulunamadı");

  console.log(`Villa: ${villa.name}`);

  await applyVillaPeriodDaysOccupancy(
    villa.id,
    "2026-07-31",
    "2026-08-05",
    "RESERVED"
  );
  console.log("31 Tem–5 Ağu RESERVED");

  await applyVillaPeriodDaysOccupancy(
    villa.id,
    "2026-08-10",
    "2026-08-13",
    "RESERVED"
  );
  console.log("10–13 Ağu RESERVED");

  const after = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId: villa.id,
      date: {
        gte: dateKeyToDbDate("2026-07-31"),
        lte: dateKeyToDbDate("2026-08-14"),
      },
    },
    orderBy: { date: "asc" },
    select: { date: true, occupancyStatus: true },
  });

  const map = buildOccupancyMap(
    after.map((d) => ({
      date: dbDateToDateKey(d.date),
      occupancyStatus: d.occupancyStatus,
    }))
  );

  console.log(
    "sonra",
    after.map((d) => `${dbDateToDateKey(d.date)}:${d.occupancyStatus}`)
  );
  console.log("5 Ağu görsel:", resolveVillaDayVisualFromMap("2026-08-05", map));
  console.log("10 Ağu görsel:", resolveVillaDayVisualFromMap("2026-08-10", map));
  console.log("11 Ağu görsel:", resolveVillaDayVisualFromMap("2026-08-11", map));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
