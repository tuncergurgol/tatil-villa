import { prisma } from "@/lib/db";
import {
  buildRegionTree,
  type RegionFlat,
  type RegionTreeNode,
} from "@/lib/regions-tree";
import { RegionLevel } from "@/lib/region-levels";
import {
  collectDescendantIds,
  getAllRegionNodes,
} from "@/lib/queries/region-tree";

const regionSelect = {
  id: true,
  slug: true,
  name: true,
  level: true,
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
  mernisIlceCode: true,
  _count: { select: { villas: true, children: true } },
} as const;

function mapRegion(
  region: {
    id: string;
    slug: string;
    name: string;
    level: RegionLevel;
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
    mernisIlceCode: string | null;
    _count: { villas: number; children: number };
  }
): RegionFlat {
  return {
    id: region.id,
    slug: region.slug,
    name: region.name,
    level: region.level,
    image: region.image,
    description: region.description,
    longDescription: region.longDescription,
    seoTitle: region.seoTitle,
    seoDescription: region.seoDescription,
    seoKeywords: region.seoKeywords,
    parentId: region.parentId,
    active: region.published,
    published: region.published,
    showInSearch: region.showInSearch,
    showInOffer: region.showInOffer,
    showOnHome: region.showOnHome,
    sortOrder: region.sortOrder,
    mernisIlceCode: region.mernisIlceCode,
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
      active: flat.filter((r) => r.published).length,
      passive: flat.filter((r) => !r.published).length,
    },
  };
}

export async function getRegionsWithCount() {
  const [ilceRegions, nodes, villaGroups] = await Promise.all([
    prisma.region.findMany({
      where: {
        active: true,
        published: true,
        level: RegionLevel.ILCE,
        showOnHome: true,
      },
      orderBy: { name: "asc" },
    }),
    getAllRegionNodes(),
    prisma.villa.groupBy({
      by: ["regionId"],
      _count: { _all: true },
    }),
  ]);

  const villaCountByRegion = new Map(
    villaGroups.map((row) => [row.regionId, row._count._all])
  );

  return ilceRegions.map((region) => {
    const descendantIds = collectDescendantIds(region.id, nodes);
    const villaCount = descendantIds.reduce(
      (sum, id) => sum + (villaCountByRegion.get(id) ?? 0),
      0
    );

    return {
      id: region.id,
      slug: region.slug,
      name: region.name,
      image: region.image,
      villaCount,
    };
  });
}

export async function getRegionBySlug(slug: string) {
  const region = await prisma.region.findUnique({
    where: { slug },
    include: {
      _count: { select: { villas: true } },
      parent: { include: { parent: true } },
    },
  });
  if (!region || !region.active || !region.published) return null;

  const displayName =
    region.level === RegionLevel.IL
      ? region.name
      : region.level === RegionLevel.ILCE
        ? [region.parent?.name, region.name].filter(Boolean).join(" › ")
        : [region.parent?.parent?.name, region.parent?.name, region.name]
            .filter(Boolean)
            .join(" › ");

  return {
    id: region.id,
    slug: region.slug,
    name: region.name,
    displayName,
    level: region.level,
    image: region.image,
    villaCount: region._count.villas,
  };
}

export async function getRegionFilterOptions() {
  const regions = await prisma.region.findMany({
    where: { active: true, published: true, showInSearch: true },
    select: { slug: true, name: true, level: true, sortOrder: true },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });

  return regions
    .sort((a, b) => {
      if (a.level !== b.level) {
        return a.level.localeCompare(b.level);
      }
      if (a.level === RegionLevel.IL) {
        return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
      }
      return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
    })
    .map((r) => ({
    slug: r.slug,
    name:
      r.level === RegionLevel.IL
        ? r.name
        : r.level === RegionLevel.ILCE
          ? `${r.name} (İlçe)`
          : r.name,
    level: r.level,
  }));
}

export async function getAllRegions() {
  return prisma.region.findMany({
    where: { active: true, level: RegionLevel.MAHALLE },
    orderBy: { name: "asc" },
  });
}

export type { RegionTreeNode, RegionFlat };
