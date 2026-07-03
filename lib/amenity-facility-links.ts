import { prisma } from "@/lib/db";

export async function resolveFacilityCategoryNamesForAmenities(
  amenityNames: string[]
) {
  if (amenityNames.length === 0) return [];

  const amenities = await prisma.amenity.findMany({
    where: { name: { in: amenityNames } },
    select: {
      facilityCategory: {
        select: { name: true },
      },
    },
  });

  return [
    ...new Set(
      amenities
        .map((amenity) => amenity.facilityCategory?.name)
        .filter((name): name is string => Boolean(name))
    ),
  ];
}

export function mergeFacilityCategoryNames(
  selectedFromForm: string[],
  linkedFromAmenities: string[]
) {
  return [
    ...new Set(
      [...selectedFromForm, ...linkedFromAmenities]
        .map((name) => name.trim())
        .filter(Boolean)
    ),
  ];
}
