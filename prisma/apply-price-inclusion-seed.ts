import { PrismaClient } from "@prisma/client";
import { syncAllPriceInclusionSortOrders } from "../lib/price-inclusion-sort";
import { PRICE_INCLUSION_SEED_DATA } from "./price-inclusion-data";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.priceInclusionItem.count();
  if (existing > 0) {
    console.log(`Zaten ${existing} kayıt var, atlanıyor.`);
    return;
  }

  for (const [index, item] of PRICE_INCLUSION_SEED_DATA.entries()) {
    await prisma.priceInclusionItem.create({
      data: {
        description: item.description,
        type: item.type,
        isDefault: item.isDefault ?? false,
        sortOrder: index + 1,
      },
    });
    console.log(`Eklendi: ${item.description}`);
  }

  await syncAllPriceInclusionSortOrders();
  console.log("Fiyata dahil kayıtları alfabetik olarak sıralandı.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
