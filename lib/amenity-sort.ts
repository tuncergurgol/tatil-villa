import { prisma } from "@/lib/db";

export function compareAmenityNames(
  a: { name: string },
  b: { name: string }
) {
  return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
}

export async function syncAlphabeticalCategorySortOrders() {
  const categories = await prisma.amenityCategory.findMany({
    select: { id: true, name: true },
  });

  categories.sort(compareAmenityNames);

  await prisma.$transaction(
    categories.map((category, index) =>
      prisma.amenityCategory.update({
        where: { id: category.id },
        data: { sortOrder: index },
      })
    )
  );
}

export async function syncAlphabeticalAmenitySortOrders(categoryId: string) {
  const amenities = await prisma.amenity.findMany({
    where: { categoryId },
    select: { id: true, name: true },
  });

  amenities.sort(compareAmenityNames);

  await prisma.$transaction(
    amenities.map((amenity, index) =>
      prisma.amenity.update({
        where: { id: amenity.id },
        data: { sortOrder: index },
      })
    )
  );
}

export async function syncAllAmenitySortOrders() {
  const categories = await prisma.amenityCategory.findMany({
    select: { id: true },
  });

  await syncAlphabeticalCategorySortOrders();

  for (const category of categories) {
    await syncAlphabeticalAmenitySortOrders(category.id);
  }
}
