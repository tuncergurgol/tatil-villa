import { prisma } from "@/lib/db";

export async function getAmenityAdminData() {
  const categories = await prisma.amenityCategory.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      sortOrder: true,
      active: true,
      amenities: {
        select: {
          id: true,
          name: true,
          categoryId: true,
          facilityCategoryId: true,
          facilityCategory: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          isDefault: true,
          sortOrder: true,
          active: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const totalAmenities = categories.reduce(
    (sum, category) => sum + category.amenities.length,
    0
  );

  const defaultAmenities = categories.flatMap((category) =>
    category.amenities.filter((amenity) => amenity.isDefault)
  );

  return {
    categories,
    totalAmenities,
    defaultCount: defaultAmenities.length,
  };
}

export async function getAmenitiesForVillaForm() {
  const { categories } = await getAmenityAdminData();
  return categories;
}

export function getDefaultAmenityNames(
  categories: Awaited<ReturnType<typeof getAmenitiesForVillaForm>>
) {
  return categories.flatMap((category) =>
    category.amenities
      .filter((amenity) => amenity.isDefault && amenity.active)
      .map((amenity) => amenity.name)
  );
}

export type AmenityCategoryItem = Awaited<
  ReturnType<typeof getAmenityAdminData>
>["categories"][number];

export type AmenityItem = AmenityCategoryItem["amenities"][number];
