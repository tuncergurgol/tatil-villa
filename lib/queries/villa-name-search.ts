import { prisma } from "@/lib/db";
import { getVillaShowcaseImage } from "@/lib/villa-gallery";
import { RegionLevel } from "@/lib/region-levels";

export type VillaNameSearchResult = {
  id: string;
  slug: string;
  name: string;
  image: string;
  regionLabel: string;
};

function buildRegionLabel(region: {
  name: string;
  level: string;
  parent: {
    name: string;
    level: string;
    parent: { name: string; level: string } | null;
  } | null;
}): string {
  const parts: { level: string; name: string }[] = [
    { level: region.level, name: region.name },
  ];

  if (region.parent) {
    parts.push({ level: region.parent.level, name: region.parent.name });
    if (region.parent.parent) {
      parts.push({
        level: region.parent.parent.level,
        name: region.parent.parent.name,
      });
    }
  }

  const order = [RegionLevel.MAHALLE, RegionLevel.ILCE, RegionLevel.IL];
  return order
    .map((level) => parts.find((part) => part.level === level)?.name)
    .filter(Boolean)
    .join(", ");
}

export async function searchActiveVillasByName(
  query: string,
  limit = 12
): Promise<VillaNameSearchResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const villas = await prisma.villa.findMany({
    where: {
      active: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { originalName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      image: true,
      images: true,
      region: {
        select: {
          name: true,
          level: true,
          parent: {
            select: {
              name: true,
              level: true,
              parent: { select: { name: true, level: true } },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return villas
    .map((villa) => ({
      id: villa.id,
      slug: villa.slug,
      name: villa.name,
      image: getVillaShowcaseImage(villa),
      regionLabel: buildRegionLabel(villa.region),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base" }));
}
