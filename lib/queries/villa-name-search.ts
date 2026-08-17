import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getVillaShowcaseImage } from "@/lib/villa-gallery";
import { RegionLevel } from "@/lib/region-levels";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import {
  getPublishUndocumentedVillaSiteKeys,
  publicSiteRequiresTourismDocument,
  withPublicSiteVillaFilter,
} from "@/lib/public-villa-site-filter";

/**
 * Türkçe karakterleri ASCII'ye katlar (I/İ/ı/i → i, ş→s, ğ→g, ü→u, ö→o, ç→c).
 * Böylece "ışıl" ile "Villa Işıl" eşleşir; Postgres ILIKE'ın Türkçe i sorunu
 * (noktalı/noktasız i) aşılır. SQL tarafında aynı katlama translate() ile yapılır.
 */
const TR_FROM = "İIıiŞşĞğÜüÖöÇç";
const TR_TO = "iiiissgguuoocc";

function foldTurkishSearch(value: string): string {
  let result = "";
  for (const char of value) {
    const index = TR_FROM.indexOf(char);
    result += index >= 0 ? TR_TO[index] : char.toLowerCase();
  }
  return result;
}

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
  limit = 12,
  siteKey?: PublicSiteKey
): Promise<VillaNameSearchResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const allowedSiteKeys = await getPublishUndocumentedVillaSiteKeys();
  const requiresDocument = publicSiteRequiresTourismDocument(
    siteKey,
    allowedSiteKeys
  );

  // Türkçe-duyarlı katlama ile eşleşen villa id'lerini bul.
  const pattern = `%${foldTurkishSearch(q).replace(/[%_\\]/g, "\\$&")}%`;
  const matches = requiresDocument
    ? await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id"
        FROM "Villa"
        WHERE "active" = true
          AND (
            "documentNo" <> ''
            OR "documentType" IS NOT NULL
          )
          AND lower(translate("name", 'İIıŞşĞğÜüÖöÇç', 'iiissgguuoocc'))
              LIKE ${pattern}
        LIMIT ${limit}
      `)
    : await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id"
        FROM "Villa"
        WHERE "active" = true
          AND lower(translate("name", 'İIıŞşĞğÜüÖöÇç', 'iiissgguuoocc'))
              LIKE ${pattern}
        LIMIT ${limit}
      `);

  const matchedIds = matches.map((row) => row.id);
  if (matchedIds.length === 0) return [];

  const villas = await prisma.villa.findMany({
    where: withPublicSiteVillaFilter(
      {
        active: true,
        id: { in: matchedIds },
      },
      siteKey,
      allowedSiteKeys
    ),
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
