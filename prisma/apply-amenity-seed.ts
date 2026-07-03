import { PrismaClient } from "@prisma/client";
import { AMENITY_SEED_DATA } from "./amenity-data";
import { syncAllAmenitySortOrders } from "../lib/amenity-sort";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.amenityCategory.count();
  if (existing > 0) {
    console.log(`Zaten ${existing} kategori var, atlanıyor.`);
    return;
  }

  for (const [categoryIndex, category] of AMENITY_SEED_DATA.entries()) {
    const createdCategory = await prisma.amenityCategory.create({
      data: {
        name: category.name,
        slug: category.slug,
        sortOrder: categoryIndex + 1,
      },
    });

    for (const [itemIndex, item] of category.items.entries()) {
      await prisma.amenity.create({
        data: {
          name: item.name,
          categoryId: createdCategory.id,
          isDefault: item.isDefault ?? false,
          sortOrder: itemIndex + 1,
        },
      });
    }

    console.log(
      `Kategori eklendi: ${category.name} (${category.items.length} olanak)`
    );
  }

  await syncAllAmenitySortOrders();
  console.log("Tesis olanakları alfabetik olarak sıralandı.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
