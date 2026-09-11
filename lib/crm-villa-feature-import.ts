import { prisma } from "@/lib/db";
import { resolveFacilityCategoryNamesForAmenities } from "@/lib/amenity-facility-links";

const PUBLIC_SOURCE_ORIGIN = "https://www.tatildeyiz.com.tr";

type JsonLdNode = {
  "@graph"?: unknown[];
  amenityFeature?: Array<{
    name?: unknown;
    value?: unknown;
  }>;
};

export type CrmVillaFeaturePreview = {
  sourceUrl: string;
  sourceNames: string[];
  matchedNames: string[];
  unmatchedNames: string[];
  currentNames: string[];
  addedNames: string[];
  removedNames: string[];
};

function normalizeKey(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function collectAmenityNames(value: unknown, names: Set<string>) {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((item) => collectAmenityNames(item, names));
    return;
  }

  const node = value as JsonLdNode;
  for (const feature of node.amenityFeature ?? []) {
    if (feature?.value === false || typeof feature?.name !== "string") continue;
    const name = decodeHtml(feature.name).trim();
    if (name) names.add(name);
  }

  if (Array.isArray(node["@graph"])) {
    node["@graph"].forEach((item) => collectAmenityNames(item, names));
  }
}

async function fetchSourceAmenityNames(slug: string) {
  const sourceUrl = `${PUBLIC_SOURCE_ORIGIN}/${slug.replace(/^\/+/, "")}`;
  const response = await fetch(sourceUrl, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Bont-CrmFeatureImport/1.0",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`CRM kaynak villa sayfası alınamadı (${response.status}).`);
  }

  const html = await response.text();
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  const names = new Set<string>();

  for (const match of scripts) {
    try {
      collectAmenityNames(JSON.parse(match[1] ?? ""), names);
    } catch {
      // Sayfadaki diğer JSON-LD blokları bozuksa geç.
    }
  }

  if (names.size === 0) {
    throw new Error("CRM kaynak kaydında villa özelliği bulunamadı.");
  }

  return { sourceUrl, sourceNames: [...names] };
}

export async function previewCrmVillaFeatures(
  villaId: string
): Promise<CrmVillaFeaturePreview> {
  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: {
      slug: true,
      amenities: true,
    },
  });
  if (!villa) throw new Error("Villa bulunamadı.");

  const [{ sourceUrl, sourceNames }, localAmenities] = await Promise.all([
    fetchSourceAmenityNames(villa.slug),
    prisma.amenity.findMany({
      where: { active: true },
      select: { name: true },
    }),
  ]);

  const localByKey = new Map(
    localAmenities.map((amenity) => [normalizeKey(amenity.name), amenity.name])
  );
  const matchedNames = [
    ...new Set(
      sourceNames
        .map((name) => localByKey.get(normalizeKey(name)))
        .filter((name): name is string => Boolean(name))
    ),
  ];
  const matchedKeys = new Set(matchedNames.map(normalizeKey));
  const currentKeys = new Set(villa.amenities.map(normalizeKey));

  return {
    sourceUrl,
    sourceNames,
    matchedNames,
    unmatchedNames: sourceNames.filter(
      (name) => !localByKey.has(normalizeKey(name))
    ),
    currentNames: villa.amenities,
    addedNames: matchedNames.filter((name) => !currentKeys.has(normalizeKey(name))),
    removedNames: villa.amenities.filter(
      (name) => !matchedKeys.has(normalizeKey(name))
    ),
  };
}

export async function importCrmVillaFeatures(villaId: string) {
  const preview = await previewCrmVillaFeatures(villaId);
  if (preview.matchedNames.length === 0) {
    throw new Error("Yerel Villa Olanakları ile eşleşen özellik bulunamadı.");
  }

  const facilityCategories = await resolveFacilityCategoryNamesForAmenities(
    preview.matchedNames
  );

  await prisma.villa.update({
    where: { id: villaId },
    data: {
      amenities: preview.matchedNames,
      facilityCategories,
    },
  });

  return {
    ...preview,
    importedCount: preview.matchedNames.length,
    facilityCategoryCount: facilityCategories.length,
  };
}
