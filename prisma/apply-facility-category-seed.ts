import { PrismaClient } from "@prisma/client";
import { syncAlphabeticalFacilityCategorySortOrders } from "../lib/facility-category-sort";
import { FACILITY_CATEGORY_SEED_DATA } from "./facility-category-data";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.facilityCategory.count();
  if (existing > 0) {
    console.log(`Zaten ${existing} kategori var, atlanıyor.`);
    return;
  }

  for (const [index, category] of FACILITY_CATEGORY_SEED_DATA.entries()) {
    await prisma.facilityCategory.create({
      data: {
        name: category.name,
        slug: category.slug,
        tag: category.tag ?? "",
        image: category.image ?? "",
        description: category.description ?? "",
        longDescription: category.longDescription ?? "",
        seoTitle: category.seoTitle ?? "",
        seoDescription: category.seoDescription ?? "",
        seoKeywords: category.seoKeywords ?? "",
        published: category.published ?? false,
        showInSearch: category.showInSearch ?? false,
        showInOffer: category.showInOffer ?? false,
        sortOrder: index + 1,
      },
    });
    console.log(`Kategori eklendi: ${category.name}`);
  }

  await syncAlphabeticalFacilityCategorySortOrders();
  console.log("Tesis kategorileri alfabetik olarak sıralandı.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
