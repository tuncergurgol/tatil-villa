import { RegionLevel } from "@/lib/region-levels";
import { prisma } from "@/lib/db";
import { buildRegionTree, type RegionFlat } from "@/lib/regions-tree";

type RegionNode = {
  id: string;
  parentId: string | null;
};

export async function getAllRegionNodes(): Promise<RegionNode[]> {
  return prisma.region.findMany({
    select: { id: true, parentId: true },
  });
}

export function collectDescendantIds(
  rootId: string,
  nodes: RegionNode[]
): string[] {
  const ids = new Set<string>();

  function walk(id: string) {
    ids.add(id);
    nodes.filter((n) => n.parentId === id).forEach((child) => walk(child.id));
  }

  walk(rootId);
  return Array.from(ids);
}

export async function getRegionIdsForFilter(slug: string): Promise<string[] | null> {
  const region = await prisma.region.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!region) return null;

  const nodes = await getAllRegionNodes();
  return collectDescendantIds(region.id, nodes);
}

export function buildRegionPath(
  regionId: string,
  flat: RegionFlat[]
): string {
  const map = new Map(flat.map((r) => [r.id, r]));
  const parts: string[] = [];
  let current = map.get(regionId);

  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? map.get(current.parentId) : undefined;
  }

  return parts.join(" › ");
}

export async function getMahalleRegionsForSelect() {
  const regions = await prisma.region.findMany({
    where: { level: RegionLevel.MAHALLE, active: true },
    select: {
      id: true,
      slug: true,
      name: true,
      level: true,
      parentId: true,
      parent: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return regions.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    label: [
      r.parent?.parent?.name,
      r.parent?.name,
      r.name,
    ]
      .filter(Boolean)
      .join(" › "),
  }));
}

export async function getRegionTreeFlat(): Promise<RegionFlat[]> {
  const regions = await prisma.region.findMany({
    select: {
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
      _count: { select: { villas: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return regions.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    level: r.level,
    image: r.image,
    description: r.description,
    longDescription: r.longDescription,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
    seoKeywords: r.seoKeywords,
    parentId: r.parentId,
    active: r.active,
    published: r.published,
    showInSearch: r.showInSearch,
    showInOffer: r.showInOffer,
    showOnHome: r.showOnHome,
    sortOrder: r.sortOrder,
    mernisIlceCode: r.mernisIlceCode,
    villaCount: r._count.villas,
  }));
}

export async function getPublicRegionTree() {
  const flat = await getRegionTreeFlat();
  const activePublished = flat.filter((r) => r.active && r.published);
  return buildRegionTree(activePublished);
}
