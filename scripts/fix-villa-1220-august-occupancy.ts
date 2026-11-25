/**
 * Villa Hayal Duo: 1–4 Ağustos hatalı dolu kaydını açar, 6–9 bloğunu korur.
 * Çalıştır: npx tsx scripts/fix-villa-1220-august-occupancy.ts
 */
import { PrismaClient } from "@prisma/client";
import { applyVillaPeriodDaysOccupancy } from "../lib/villa-occupancy-service";
import { dateKeyToDbDate, dbDateToDateKey } from "../lib/villa-period-calendar";

const prisma = new PrismaClient();

async function main() {
  const villa = await prisma.villa.findFirst({
    where: { villaId: 1220 },
    select: { id: true, name: true },
  });
  if (!villa) throw new Error("Villa 1220 bulunamadı");

  const before = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId: villa.id,
      date: {
        gte: dateKeyToDbDate("2026-08-01"),
        lte: dateKeyToDbDate("2026-08-12"),
      },
    },
    orderBy: { date: "asc" },
    select: { date: true, occupancyStatus: true },
  });

  console.log(
    "önce",
    before.map((d) => `${dbDateToDateKey(d.date)}:${d.occupancyStatus}`)
  );

  const hasPriorBlock = before.some(
    (d) =>
      dbDateToDateKey(d.date) >= "2026-08-01" &&
      dbDateToDateKey(d.date) <= "2026-08-04" &&
      d.occupancyStatus === "BOOKED"
  );

  if (hasPriorBlock) {
    await applyVillaPeriodDaysOccupancy(
      villa.id,
      "2026-08-01",
      "2026-08-04",
      "EMPTY"
    );
    console.log("1–4 Ağustos açıldı");
  }

  await applyVillaPeriodDaysOccupancy(
    villa.id,
    "2026-08-06",
    "2026-08-09",
    "BOOKED"
  );
  console.log("6–9 Ağustos doğrulandı");

  const after = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId: villa.id,
      date: {
        gte: dateKeyToDbDate("2026-08-01"),
        lte: dateKeyToDbDate("2026-08-12"),
      },
    },
    orderBy: { date: "asc" },
    select: { date: true, occupancyStatus: true },
  });

  console.log(
    "sonra",
    after.map((d) => `${dbDateToDateKey(d.date)}:${d.occupancyStatus}`)
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
