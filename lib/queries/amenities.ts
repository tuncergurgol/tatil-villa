import { prisma } from "@/lib/db";
import {
  compareAmenityNamesTr,
  isFeaturedAmenityCategory,
} from "@/lib/amenity-featured";

export async function getAmenityAdminData() {
  const categories = (await prisma.amenityCategory.findMany({
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
          showInSearch: true,
          sortOrder: true,
          active: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })).map((category) =>
    isFeaturedAmenityCategory(category.name)
      ? {
          ...category,
          amenities: [...category.amenities].sort((a, b) =>
            compareAmenityNamesTr(a.name, b.name)
          ),
        }
      : category
  );

  const totalAmenities = categories.reduce(
    (sum, category) => sum + category.amenities.length,
    0
  );

  const defaultAmenities = categories.flatMap((category) =>
    category.amenities.filter((amenity) => amenity.isDefault)
  );

  const searchAmenities = categories.flatMap((category) =>
    category.amenities.filter((amenity) => amenity.showInSearch)
  );

  return {
    categories,
    totalAmenities,
    defaultCount: defaultAmenities.length,
    searchCount: searchAmenities.length,
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
