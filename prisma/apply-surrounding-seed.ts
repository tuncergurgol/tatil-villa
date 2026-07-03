import { PrismaClient } from "@prisma/client";
import { SURROUNDING_SEED_DATA } from "./surrounding-data";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.surroundingCategory.count();
  if (existing > 0) {
    console.log(`Zaten ${existing} kategori var, atlanıyor.`);
    return;
  }

  for (const [categoryIndex, category] of SURROUNDING_SEED_DATA.entries()) {
    const createdCategory = await prisma.surroundingCategory.create({
      data: {
        name: category.name,
        slug: category.slug,
        sortOrder: categoryIndex + 1,
      },
    });

    for (const [locationIndex, locationName] of category.locations.entries()) {
      await prisma.surroundingLocation.create({
        data: {
          name: locationName,
          categoryId: createdCategory.id,
          sortOrder: locationIndex + 1,
        },
      });
    }

    console.log(
      `Kategori eklendi: ${category.name} (${category.locations.length} konum)`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
