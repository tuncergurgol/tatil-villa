import { prisma } from "@/lib/db";
import { compareSurroundingNames } from "@/lib/surrounding-utils";
import type {
  RegionPickerOption,
  SurroundingLocationOption,
} from "@/lib/villa-location-helpers";

export type {
  RegionPickerOption,
  SurroundingLocationOption,
} from "@/lib/villa-location-helpers";

export {
  buildRegionSelectionLabel,
  formatVillaRegionLabel,
  formatVillaRegionLabelMahalleIlceIl,
  resolveRegionHierarchy,
} from "@/lib/villa-location-helpers";

export async function getVillaLocationFormData(villaId: string) {
  const [regions, surroundingCategories, distances] = await Promise.all([
    prisma.region.findMany({
      where: { active: true, published: true },
      select: {
        id: true,
        name: true,
        level: true,
        parentId: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.surroundingCategory.findMany({
      where: { active: true },
      select: {
        name: true,
        sortOrder: true,
        locations: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            sortOrder: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.villaSurroundingDistance.findMany({
      where: { villaId },
      select: {
        surroundingLocationId: true,
        distanceKm: true,
      },
    }),
  ]);

  const surroundingLocations: SurroundingLocationOption[] =
    surroundingCategories.flatMap((category) =>
      [...category.locations]
        .sort((left, right) => compareSurroundingNames(left.name, right.name))
        .map((location) => ({
          id: location.id,
          name: location.name,
          categoryName: category.name,
          sortOrder: category.sortOrder * 1000 + location.sortOrder,
        }))
    );

  const distanceByLocationId = new Map(
    distances.map((item) => [item.surroundingLocationId, item.distanceKm])
  );

  return {
    regions: regions as RegionPickerOption[],
    surroundingLocations,
    distanceByLocationId,
  };
}
