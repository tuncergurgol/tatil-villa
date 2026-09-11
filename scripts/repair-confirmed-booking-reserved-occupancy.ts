/**
 * Onaylı rezervasyonların takvim günlerini RESERVED (lila) yapar.
 * Çalıştır: npx tsx scripts/repair-confirmed-booking-reserved-occupancy.ts [externalCode?]
 */
import { PrismaClient } from "@prisma/client";
import { applyVillaPeriodDaysOccupancy } from "../lib/villa-occupancy-service";
import { dbDateToDateKey } from "../lib/villa-period-calendar";

const prisma = new PrismaClient();

async function main() {
  const onlyCode = process.argv[2] ? Number(process.argv[2]) : null;
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      ...(onlyCode != null && !Number.isNaN(onlyCode)
        ? { externalCode: onlyCode }
        : {}),
    },
    select: {
      id: true,
      externalCode: true,
      villaId: true,
      checkIn: true,
      checkOut: true,
      villa: { select: { villaId: true, name: true } },
    },
    orderBy: { checkIn: "asc" },
  });

  console.log("confirmed bookings", bookings.length);
  let total = 0;
  for (const booking of bookings) {
    const start = dbDateToDateKey(booking.checkIn);
    const end = dbDateToDateKey(booking.checkOut);
    const result = await applyVillaPeriodDaysOccupancy(
      booking.villaId,
      start,
      end,
      "RESERVED"
    );
    total += result.updatedDays;
    console.log(
      `#${booking.externalCode ?? booking.id}`,
      booking.villa?.name,
      start,
      "→",
      end,
      "updated",
      result.updatedDays
    );
  }
  console.log("total updated days", total);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
