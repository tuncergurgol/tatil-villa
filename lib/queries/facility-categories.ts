import { prisma } from "@/lib/db";

export async function getFacilityCategoryAdminData() {
  const categories = await prisma.facilityCategory.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      tag: true,
      image: true,
      description: true,
      longDescription: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      published: true,
      showInSearch: true,
      showInOffer: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return {
    categories,
    totalCount: categories.length,
    activeCount: categories.filter((item) => item.published).length,
    passiveCount: categories.filter((item) => !item.published).length,
  };
}

export type FacilityCategoryItem = Awaited<
  ReturnType<typeof getFacilityCategoryAdminData>
>["categories"][number];

export async function getFacilityCategoriesForPicker() {
  return prisma.facilityCategory.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export type FacilityCategoryOption = Awaited<
  ReturnType<typeof getFacilityCategoriesForPicker>
>[number];
