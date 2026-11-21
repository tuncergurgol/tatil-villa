import { PrismaClient } from "@prisma/client";
import { syncAlphabeticalFacilityCategorySortOrders } from "../lib/facility-category-sort";
import { FACILITY_CATEGORY_SEED_DATA } from "./facility-category-data";
import { HOME_DREAM_CATEGORY_CARDS } from "../lib/home-dream-categories";

const prisma = new PrismaClient();

async function upsertCategory(
  category: (typeof FACILITY_CATEGORY_SEED_DATA)[number],
  sortOrder: number
) {
  const existing = await prisma.facilityCategory.findUnique({
    where: { slug: category.slug },
    select: { id: true },
  });

  if (existing) {
    const current = await prisma.facilityCategory.findUnique({
      where: { id: existing.id },
      select: { image: true },
    });
    const nextImage = category.image ?? "";
    const shouldRefreshImage =
      Boolean(nextImage) &&
      (!current?.image ||
        current.image.includes("photo-1600047509807-ba8f99d2cd2e"));

    if (shouldRefreshImage) {
      await prisma.facilityCategory.update({
        where: { id: existing.id },
        data: { image: nextImage },
      });
      console.log(`Görsel güncellendi: ${category.name}`);
      return "updated" as const;
    }

    console.log(`Mevcut: ${category.name}`);
    return "skipped" as const;
  }

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
      sortOrder,
    },
  });
  console.log(`Kategori eklendi: ${category.name}`);
  return "created" as const;
}

async function main() {
  const existingCount = await prisma.facilityCategory.count();
  const dreamSlugs = HOME_DREAM_CATEGORY_CARDS.map((card) => card.facilitySlug);

  const maxSort = await prisma.facilityCategory.aggregate({
    _max: { sortOrder: true },
  });
  let nextSort = (maxSort._max.sortOrder ?? 0) + 1;
  let created = 0;

  for (const [index, category] of FACILITY_CATEGORY_SEED_DATA.entries()) {
    const sortOrder = existingCount === 0 ? index + 1 : nextSort;
    const result = await upsertCategory(category, sortOrder);
    if (result === "created") {
      created += 1;
      if (existingCount > 0) nextSort += 1;
    }
  }

  if (created > 0 || existingCount === 0) {
    await syncAlphabeticalFacilityCategorySortOrders();
  }

  console.log(
    `Tamamlandı. Yeni eklenen: ${created}. Dream slug’lar: ${dreamSlugs.join(", ")}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
