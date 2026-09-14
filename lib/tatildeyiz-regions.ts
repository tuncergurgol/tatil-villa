import { RegionLevel } from "@prisma/client";

const TATILDEYIZ_API_BASE = "https://api.tatildeyiz.com.tr";
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; TatilVillaRegionImport/1.0)",
  Accept: "application/json",
};

const DEFAULT_IMAGES = {
  il: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
  ilce: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
  mahalle: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80",
};

export type TatildeyizCrmRegionRaw = {
  id: number;
  name: string;
  parentId: number;
  onList: boolean;
  onSearchList: boolean;
  onOfferList: boolean;
  previewImg: string | null;
  explain: string | null;
  longDesc: string | null;
  priority: number | null;
  seoTitle: string | null;
  seoDesc: string | null;
  seoKeywords: string | null;
  sefUrl: string;
  showOnHomepage: boolean;
  mernisCode: string | null;
};

export type TatildeyizCrmRegionMapped = {
  crmId: number;
  slug: string;
  name: string;
  level: RegionLevel;
  parentCrmId: number | null;
  image: string;
  description: string;
  longDescription: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  published: boolean;
  showInSearch: boolean;
  showInOffer: boolean;
  showOnHome: boolean;
  sortOrder: number;
  mernisIlceCode: string | null;
};

type RegionsApiResponse = {
  success?: boolean;
  content?: TatildeyizCrmRegionRaw[];
};

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function textOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function defaultImageForLevel(level: RegionLevel): string {
  if (level === RegionLevel.IL) return DEFAULT_IMAGES.il;
  if (level === RegionLevel.ILCE) return DEFAULT_IMAGES.ilce;
  return DEFAULT_IMAGES.mahalle;
}

function inferLevels(
  regions: TatildeyizCrmRegionRaw[]
): Map<number, RegionLevel> {
  const byId = new Map(regions.map((region) => [region.id, region]));
  const levels = new Map<number, RegionLevel>();

  function depth(regionId: number, seen = new Set<number>()): number {
    if (seen.has(regionId)) return 0;
    seen.add(regionId);
    const region = byId.get(regionId);
    if (!region) return 0;
    if (region.id === 1 || region.parentId === region.id) return 0;
    if (region.parentId === 1) return 1;
    return depth(region.parentId, seen) + 1;
  }

  for (const region of regions) {
    if (region.id === 1) continue;
    const d = depth(region.id);
    if (d <= 1) levels.set(region.id, RegionLevel.IL);
    else if (d === 2) levels.set(region.id, RegionLevel.ILCE);
    else levels.set(region.id, RegionLevel.MAHALLE);
  }

  return levels;
}

export function mapTatildeyizCrmRegion(
  raw: TatildeyizCrmRegionRaw,
  level: RegionLevel
): TatildeyizCrmRegionMapped {
  const slug = normalizeSlug(raw.sefUrl || raw.name);
  const image = raw.previewImg?.trim() || defaultImageForLevel(level);

  return {
    crmId: raw.id,
    slug,
    name: raw.name.trim(),
    level,
    parentCrmId:
      raw.id === 1 || raw.parentId === raw.id || raw.parentId === 1
        ? null
        : raw.parentId,
    image,
    description: textOrEmpty(raw.explain),
    longDescription: textOrEmpty(raw.longDesc),
    seoTitle: textOrEmpty(raw.seoTitle),
    seoDescription: textOrEmpty(raw.seoDesc),
    seoKeywords: textOrEmpty(raw.seoKeywords),
    published: raw.onList,
    showInSearch: raw.onSearchList,
    showInOffer: raw.onOfferList,
    showOnHome: raw.showOnHomepage,
    sortOrder: raw.priority ?? 0,
    mernisIlceCode: raw.mernisCode?.trim() || null,
  };
}

export async function fetchTatildeyizCrmRegionsRaw(): Promise<
  TatildeyizCrmRegionRaw[]
> {
  const response = await fetch(
    `${TATILDEYIZ_API_BASE}/v1/admin/regionsListSwr`,
    { headers: FETCH_HEADERS }
  );

  if (!response.ok) {
    throw new Error(`CRM bölgeleri alınamadı (${response.status})`);
  }

  const data = (await response.json()) as RegionsApiResponse;
  const content = data.content ?? [];

  if (content.length === 0) {
    throw new Error("CRM bölge listesi boş döndü");
  }

  return content;
}

export async function fetchTatildeyizRegions(): Promise<
  TatildeyizCrmRegionMapped[]
> {
  const rawRegions = await fetchTatildeyizCrmRegionsRaw();
  const levels = inferLevels(rawRegions);

  return rawRegions
    .filter((region) => region.id !== 1)
    .map((region) => {
      const level = levels.get(region.id) ?? RegionLevel.MAHALLE;
      return mapTatildeyizCrmRegion(region, level);
    });
}
