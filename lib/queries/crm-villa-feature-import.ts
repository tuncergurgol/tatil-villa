import { prisma } from "@/lib/db";

export async function getCrmVillaFeatureImportRows() {
  return prisma.villa.findMany({
    select: {
      id: true,
      villaId: true,
      name: true,
      originalName: true,
      slug: true,
      active: true,
      amenities: true,
      updatedAt: true,
    },
    orderBy: [{ villaId: "asc" }, { name: "asc" }],
  });
}

export type CrmVillaFeatureImportRow = Awaited<
  ReturnType<typeof getCrmVillaFeatureImportRows>
>[number];
