import { prisma } from "@/lib/db";
import { compareSurroundingNames } from "@/lib/surrounding-utils";
import { RegionLevel } from "@/lib/region-levels";

export async function getSurroundingAdminData() {
  const [categories, provinces] = await Promise.all([
    prisma.surroundingCategory.findMany({
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
            latitude: true,
            longitude: true,
            isDefault: true,
            sortOrder: true,
            active: true,
            regionScopes: {
              select: {
                regionId: true,
                region: {
                  select: {
                    id: true,
                    name: true,
                    level: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.region.findMany({
      where: { active: true, level: RegionLevel.IL },
      select: { id: true, name: true, level: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const sortedCategories = categories.map((category) => ({
    ...category,
    locations: [...category.locations]
      .sort((left, right) => compareSurroundingNames(left.name, right.name))
      .map((location) => ({
        ...location,
        regionIds: location.regionScopes.map((scope) => scope.regionId),
        regions: location.regionScopes.map((scope) => scope.region),
      })),
  }));

  const totalLocations = sortedCategories.reduce(
    (sum, category) => sum + category.locations.length,
    0
  );

  return {
    categories: sortedCategories,
    totalLocations,
    provinces,
  };
}

export type SurroundingCategoryItem = Awaited<
  ReturnType<typeof getSurroundingAdminData>
>["categories"][number];

export type SurroundingLocationItem =
  SurroundingCategoryItem["locations"][number];

export type SurroundingProvinceOption = Awaited<
  ReturnType<typeof getSurroundingAdminData>
>["provinces"][number];
