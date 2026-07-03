import { prisma } from "@/lib/db";

export async function getSurroundingAdminData() {
  const categories = await prisma.surroundingCategory.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      sortOrder: true,
      active: true,
      locations: {
        select: {
          id: true,
          name: true,
          categoryId: true,
          sortOrder: true,
          active: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const totalLocations = categories.reduce(
    (sum, category) => sum + category.locations.length,
    0
  );

  return { categories, totalLocations };
}

export type SurroundingCategoryItem = Awaited<
  ReturnType<typeof getSurroundingAdminData>
>["categories"][number];

export type SurroundingLocationItem =
  SurroundingCategoryItem["locations"][number];
