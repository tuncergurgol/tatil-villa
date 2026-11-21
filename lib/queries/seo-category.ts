import { prisma } from "@/lib/db";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import {
  buildMatrixCategorySlug,
  isStockIndexable,
  matrixFacilitiesForSite,
  parseSeoCategorySlug,
  SEO_MATRIX_REGION_SLUGS,
  type ParsedSeoCategorySlug,
} from "@/lib/seo-matrix";
import { getRegionBySlug } from "@/lib/queries/regions";
import { getRegionIdsForFilter } from "@/lib/queries/region-tree";
import { getVillaSearchResults } from "@/lib/queries/villas";
import { resolvePublicSiteVillaFilter } from "@/lib/public-villa-site-filter";

export type SeoFacilityRecord = {
  id: string;
  slug: string;
  name: string;
  longDescription: string;
  seoTitle: string;
  seoDescription: string;
};

export async function getFacilityCategoryBySlug(
  slug: string
): Promise<SeoFacilityRecord | null> {
  return prisma.facilityCategory.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      longDescription: true,
      seoTitle: true,
      seoDescription: true,
    },
  });
}

export async function resolveSeoCategory(
  rawSlug: string,
  siteKey: PublicSiteKey
): Promise<{
  parsed: ParsedSeoCategorySlug;
  region: Awaited<ReturnType<typeof getRegionBySlug>>;
  facility: SeoFacilityRecord;
} | null> {
  const knownFacilities = matrixFacilitiesForSite(siteKey);
  const dbFacilities = await prisma.facilityCategory.findMany({
    select: { slug: true },
  });
  const facilitySlugs = [
    ...new Set([...knownFacilities, ...dbFacilities.map((f) => f.slug)]),
  ];

  const parsed = parseSeoCategorySlug(
    rawSlug,
    facilitySlugs,
    SEO_MATRIX_REGION_SLUGS
  );
  if (!parsed) return null;

  const facility = await getFacilityCategoryBySlug(parsed.facilitySlug);
  if (!facility) return null;

  if (parsed.kind === "facility") {
    return { parsed, region: null, facility };
  }

  const region = await getRegionBySlug(parsed.regionSlug, siteKey);
  if (!region) return null;
  return { parsed, region, facility };
}

export async function countSeoCategoryStock(input: {
  siteKey: PublicSiteKey;
  regionSlug?: string;
  facilityName: string;
}): Promise<number> {
  const result = await getVillaSearchResults({
    region: input.regionSlug,
    facilities: [input.facilityName],
    page: 1,
    pageSize: 1,
    siteKey: input.siteKey,
  });
  return result.totalCount;
}

/** Sitemap: stok eşiğini geçen ilk dalga kategori slug’ları. */
export async function listIndexableSeoCategorySlugs(
  siteKey: PublicSiteKey
): Promise<Array<{ slug: string; title: string }>> {
  const facilitySlugs = matrixFacilitiesForSite(siteKey);
  const facilities = await prisma.facilityCategory.findMany({
    where: { slug: { in: [...facilitySlugs] } },
    select: { slug: true, name: true },
  });
  if (facilities.length === 0) return [];

  const villaWhere = await resolvePublicSiteVillaFilter(
    { active: true, showInSearch: true },
    siteKey
  );
  const villas = await prisma.villa.findMany({
    where: villaWhere,
    select: {
      regionId: true,
      facilityCategories: true,
    },
  });

  const regionIdSets = new Map<string, Set<string>>();
  await Promise.all(
    SEO_MATRIX_REGION_SLUGS.map(async (regionSlug) => {
      const ids = await getRegionIdsForFilter(regionSlug);
      if (ids?.length) regionIdSets.set(regionSlug, new Set(ids));
    })
  );

  const out: Array<{ slug: string; title: string }> = [];

  for (const facility of facilities) {
    const facilityCount = villas.filter((v) =>
      v.facilityCategories.includes(facility.name)
    ).length;
    if (isStockIndexable(facilityCount)) {
      out.push({ slug: facility.slug, title: facility.name });
    }

    for (const regionSlug of SEO_MATRIX_REGION_SLUGS) {
      const idSet = regionIdSets.get(regionSlug);
      if (!idSet) continue;
      const count = villas.filter(
        (v) =>
          idSet.has(v.regionId) &&
          v.facilityCategories.includes(facility.name)
      ).length;
      if (!isStockIndexable(count)) continue;
      out.push({
        slug: buildMatrixCategorySlug(regionSlug, facility.slug),
        title: `${regionSlug} ${facility.name}`,
      });
    }
  }

  return out;
}
