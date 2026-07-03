import { RegionLevel } from "@/lib/region-levels";
import { prisma } from "@/lib/db";

export async function syncAlphabeticalSiblingSortOrders(
  parentId: string | null,
  level: RegionLevel
) {
  if (level !== RegionLevel.ILCE && level !== RegionLevel.MAHALLE) {
    return;
  }

  const siblings = await prisma.region.findMany({
    where: { parentId, level },
    select: { id: true },
    orderBy: { name: "asc" },
  });

  await prisma.$transaction(
    siblings.map((sibling, index) =>
      prisma.region.update({
        where: { id: sibling.id },
        data: { sortOrder: index },
      })
    )
  );
}
