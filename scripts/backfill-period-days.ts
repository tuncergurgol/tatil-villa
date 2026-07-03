import { PrismaClient } from "@prisma/client";
import { backfillVillaPricePeriodDays } from "../lib/villa-period-day-sync";

const prisma = new PrismaClient();

async function main() {
  const villas = await prisma.villa.findMany({ select: { id: true } });
  for (const villa of villas) {
    await backfillVillaPricePeriodDays(villa.id);
    console.log(`Backfilled ${villa.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
