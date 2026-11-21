import { prisma } from "@/lib/db";

export async function getVillaFeatureTransferRows() {
  return prisma.villa.findMany({
    select: {
      id: true,
      villaId: true,
      name: true,
      originalName: true,
      slug: true,
      active: true,
      bedrooms: true,
      amenities: true,
      rooms: {
        select: {
          features: true,
          customFeatures: true,
          imageUrl: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      updatedAt: true,
    },
    orderBy: [{ villaId: "asc" }, { name: "asc" }],
  });
}

export type VillaFeatureTransferRow = Awaited<
  ReturnType<typeof getVillaFeatureTransferRows>
>[number];
