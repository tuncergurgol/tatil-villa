import { prisma } from "@/lib/db";
import { compareSurroundingNames } from "@/lib/surrounding-utils";

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
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const sortedCategories = categories.map((category) => ({
    ...category,
    locations: [...category.locations].sort((left, right) =>
      compareSurroundingNames(left.name, right.name)
    ),
  }));

  const totalLocations = sortedCategories.reduce(
    (sum, category) => sum + category.locations.length,
    0
  );

  return { categories: sortedCategories, totalLocations };
}

export type SurroundingCategoryItem = Awaited<
  ReturnType<typeof getSurroundingAdminData>
>["categories"][number];

export type SurroundingLocationItem =
  SurroundingCategoryItem["locations"][number];
