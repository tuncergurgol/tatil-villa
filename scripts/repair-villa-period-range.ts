/**
 * Villa Hasbel (dbVillaId 2213) icin 14-17 Temmuz yanlis periyot kaydini 15-18 olarak duzeltir.
 * Kullanim: npx tsx scripts/repair-villa-period-range.ts
 */
import { PrismaClient } from "@prisma/client";
import { dateKeyToDbDate } from "../lib/villa-period-calendar";

const VILLA_PRISMA_ID = "cmr633sab02bvu6ekcygibfp5";
const WRONG_START = "2026-07-14";
const WRONG_END = "2026-07-17";
const CORRECT_START = "2026-07-15";
const CORRECT_END = "2026-07-18";
const TARGET_PRICE = 15000;

const prisma = new PrismaClient();

async function main() {
  const period = await prisma.villaPricePeriod.findFirst({
    where: {
      villaId: VILLA_PRISMA_ID,
      startDate: dateKeyToDbDate(WRONG_START),
      endDate: dateKeyToDbDate(WRONG_END),
      nightlyPrice: TARGET_PRICE,
    },
  });

  if (!period) {
    console.log("Duzeltilecek periyot bulunamadi; zaten duzelmis olabilir.");
    return;
  }

  await prisma.villaPricePeriod.update({
    where: { id: period.id },
    data: {
      startDate: dateKeyToDbDate(CORRECT_START),
      endDate: dateKeyToDbDate(CORRECT_END),
    },
  });

  console.log(
    `Periyot guncellendi: ${WRONG_START}-${WRONG_END} -> ${CORRECT_START}-${CORRECT_END} (${period.id})`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
