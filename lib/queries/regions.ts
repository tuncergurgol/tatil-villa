import { prisma } from "@/lib/db";
import {
  buildRegionTree,
  type RegionFlat,
  type RegionTreeNode,
} from "@/lib/regions-tree";

const regionSelect = {
  id: true,
  slug: true,
  name: true,
  image: true,
  description: true,
  longDescription: true,
  seoTitle: true,
  seoDescription: true,
  seoKeywords: true,
  parentId: true,
  active: true,
  published: true,
  showInSearch: true,
  showInOffer: true,
  showOnHome: true,
  sortOrder: true,
  _count: { select: { villas: true, children: true } },
} as const;

function mapRegion(
  region: {
    id: string;
    slug: string;
    name: string;
    image: string;
    description: string;
    longDescription: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    parentId: string | null;
    active: boolean;
    published: boolean;
    showInSearch: boolean;
    showInOffer: boolean;
    showOnHome: boolean;
    sortOrder: number;
    _count: { villas: number; children: number };
  }
): RegionFlat {
  return {
    id: region.id,
    slug: region.slug,
    name: region.name,
    image: region.image,
    description: region.description,
    longDescription: region.longDescription,
    seoTitle: region.seoTitle,
    seoDescription: region.seoDescription,
    seoKeywords: region.seoKeywords,
    parentId: region.parentId,
    active: region.active,
    published: region.published,
    showInSearch: region.showInSearch,
    showInOffer: region.showInOffer,
    showOnHome: region.showOnHome,
    sortOrder: region.sortOrder,
    villaCount: region._count.villas,
  };
}

export async function getAdminRegionData() {
  const regions = await prisma.region.findMany({
    select: regionSelect,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const flat = regions.map(mapRegion);
  const tree = buildRegionTree(flat);

  return {
    tree,
    flat,
    stats: {
      total: flat.length,
      active: flat.filter((r) => r.active).length,
      passive: flat.filter((r) => !r.active).length,
    },
  };
}

export async function getRegionsWithCount() {
  const regions = await prisma.region.findMany({
    where: { active: true, published: true },
    include: { _count: { select: { villas: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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
  if (!region || !region.active || !region.published) return null;
  return {
    id: region.id,
    slug: region.slug,
    name: region.name,
    image: region.image,
    villaCount: region._count.villas,
  };
}

export async function getAllRegions() {
  return prisma.region.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export type { RegionTreeNode, RegionFlat };
