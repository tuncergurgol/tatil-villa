import { prisma } from "@/lib/db";

export async function getRegionsWithCount() {
  const regions = await prisma.region.findMany({
    include: { _count: { select: { villas: true } } },
    orderBy: { name: "asc" },
  });

  return regions.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    image: r.image,
    villaCount: r._count.villas,
  }));
}

export async function getRegionBySlug(slug: string) {
  const region = await prisma.region.findUnique({
    where: { slug },
    include: { _count: { select: { villas: true } } },
  });
  if (!region) return null;
  return {
    id: region.id,
    slug: region.slug,
    name: region.name,
    image: region.image,
    villaCount: region._count.villas,
  };
}

export async function getAllRegions() {
  return prisma.region.findMany({ orderBy: { name: "asc" } });
}
