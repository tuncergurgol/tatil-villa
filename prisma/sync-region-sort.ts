import { PrismaClient, RegionLevel } from "@prisma/client";
import { syncAlphabeticalSiblingSortOrders } from "../lib/region-sort";

const prisma = new PrismaClient();

async function main() {
  const ils = await prisma.region.findMany({
    where: { level: RegionLevel.IL },
    select: { id: true },
  });

  for (const il of ils) {
    await syncAlphabeticalSiblingSortOrders(il.id, RegionLevel.ILCE);
  }

  const ilces = await prisma.region.findMany({
    where: { level: RegionLevel.ILCE },
    select: { id: true },
  });

  for (const ilce of ilces) {
    await syncAlphabeticalSiblingSortOrders(ilce.id, RegionLevel.MAHALLE);
  }

  console.log("İlçe ve mahalle sıralaması alfabetik olarak güncellendi.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
