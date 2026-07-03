import { prisma } from "@/lib/db";

export function compareFacilityCategoryNames(
  a: { name: string },
  b: { name: string }
) {
  return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
}

export async function syncAlphabeticalFacilityCategorySortOrders() {
  const categories = await prisma.facilityCategory.findMany({
    select: { id: true, name: true },
  });

  categories.sort(compareFacilityCategoryNames);

  await prisma.$transaction(
    categories.map((category, index) =>
      prisma.facilityCategory.update({
        where: { id: category.id },
        data: { sortOrder: index },
      })
    )
  );
}
