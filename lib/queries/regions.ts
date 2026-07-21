import { RegionLevel } from "@/lib/region-levels";
import { prisma } from "@/lib/db";
import {
  buildRegionTree,
  type RegionFlat,
  type RegionTreeNode,
} from "@/lib/regions-tree";
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

type RegionWithVillaCount = {
  id: string;
  slug: string;
  name: string;
  image: string;
  level: RegionLevel;
  villaCount: number;
};

async function getRegionVillaCountMaps() {
  const [nodes, villaGroups] = await Promise.all([
    getAllRegionNodes(),
    prisma.villa.groupBy({
      by: ["regionId"],
      where: { active: true },
      _count: { _all: true },
    }),
  ]);

  const villaCountByRegion = new Map(
    villaGroups.map((row) => [row.regionId, row._count._all])
  );

  return { nodes, villaCountByRegion };
}

function mapRegionsWithDescendantVillaCounts(
  candidates: Array<{
    id: string;
    slug: string;
    name: string;
    image: string;
    level: RegionLevel;
  }>,
  nodes: Awaited<ReturnType<typeof getAllRegionNodes>>,
  villaCountByRegion: Map<string, number>
): RegionWithVillaCount[] {
  return candidates
    .map((region) => {
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
        level: region.level,
        villaCount,
      };
    })
    .filter((region) => region.villaCount > 0);
}

export async function getRegionsWithCount() {
  const [{ nodes, villaCountByRegion }, candidates] = await Promise.all([
    getRegionVillaCountMaps(),
    prisma.region.findMany({
      where: {
        active: true,
        published: true,
        OR: [
          { level: RegionLevel.IL, showInSearch: true },
          { level: RegionLevel.ILCE, showOnHome: true },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        image: true,
        level: true,
        sortOrder: true,
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return mapRegionsWithDescendantVillaCounts(candidates, nodes, villaCountByRegion).sort(
    (a, b) => {
      const aIsIl = a.level === RegionLevel.IL;
      const bIsIl = b.level === RegionLevel.IL;
      if (aIsIl !== bIsIl) return aIsIl ? -1 : 1;
      return (
        b.villaCount - a.villaCount ||
        a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
      );
    }
  );
}

export async function getRegionBySlug(slug: string) {
  const region = await prisma.region.findUnique({
    where: { slug },
    include: {
      _count: { select: { villas: { where: { active: true } } } },
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

export async function getHeroSearchRegions() {
  const regions = await prisma.region.findMany({
    where: {
      active: true,
      published: true,
      OR: [
        { level: RegionLevel.IL, showInSearch: true },
        { level: RegionLevel.ILCE },
      ],
    },
    select: { slug: true, name: true, level: true, sortOrder: true },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return regions.map((region) => ({
    slug: region.slug,
    name: region.name,
    level: region.level,
    label:
      region.level === RegionLevel.IL
        ? `${region.name} (İl)`
        : `${region.name} Kiralık Villa`,
  }));
}

export async function getAllRegions() {
  return prisma.region.findMany({
    where: { active: true, level: RegionLevel.MAHALLE },
    orderBy: { name: "asc" },
  });
}

/** Footer: görünür İl/İlçe (aktif villa > 0) + SEO için gizli linkler */
export async function getFooterRegionLinks() {
  const [candidates, mahalles, nodes, villaGroups] = await Promise.all([
    prisma.region.findMany({
      where: {
        active: true,
        published: true,
        level: { in: [RegionLevel.IL, RegionLevel.ILCE] },
        OR: [{ showOnHome: true }, { showInSearch: true }],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        level: true,
      },
    }),
    prisma.region.findMany({
      where: {
        active: true,
        published: true,
        level: RegionLevel.MAHALLE,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
    getAllRegionNodes(),
    prisma.villa.groupBy({
      by: ["regionId"],
      where: { active: true },
      _count: { _all: true },
    }),
  ]);

  const villaCountByRegion = new Map(
    villaGroups.map((row) => [row.regionId, row._count._all])
  );

  const withCounts = candidates.map((region) => {
    const descendantIds = collectDescendantIds(region.id, nodes);
    const villaCount = descendantIds.reduce(
      (sum, id) => sum + (villaCountByRegion.get(id) ?? 0),
      0
    );
    return { ...region, villaCount };
  });

  const popular = withCounts
    .filter((region) => region.villaCount > 0)
    .sort(
      (a, b) =>
        b.villaCount - a.villaCount ||
        a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
    )
    .map((region) => ({
      slug: region.slug,
      name: region.name,
      label: `${region.name} Kiralık Villalar`,
      level: region.level,
    }));

  const zeroCountHidden = withCounts
    .filter((region) => region.villaCount === 0)
    .map((region) => ({
      slug: region.slug,
      name: region.name,
      label: `${region.name} Kiralık Villalar`,
    }));

  const mahalleLinks = mahalles.map((region) => ({
    slug: region.slug,
    name: region.name,
    label: `${region.name} Kiralık Villalar`,
  }));

  return {
    popular,
    mahalles: [...zeroCountHidden, ...mahalleLinks],
  };
}

export type { RegionTreeNode, RegionFlat };
