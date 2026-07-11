import type { PrismaClient } from "@prisma/client";
import { toSurroundingSlug } from "@/lib/surrounding-utils";
import {
  fetchTatildeyizPropertyWithDelay,
  type TatildeyizProperty,
  type TatildeyizPropertyAddress,
  type TatildeyizPropertyLocation,
} from "@/lib/tatildeyiz-property";

export type ImportVillaLocationResult = {
  slug: string;
  villaId?: string;
  dbVillaId?: number | null;
  name?: string;
  status: "success" | "skipped" | "error";
  latitude?: number | null;
  longitude?: number | null;
  locationLabel?: string | null;
  distanceCount?: number;
  createdLocations?: number;
  createdCategories?: number;
  error?: string;
};

function parseCoordinate(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;

  const raw = String(value).trim().replace(",", ".");
  if (!raw) return null;

  let n = parseFloat(raw);
  if (!Number.isFinite(n)) return null;

  // Tatildeyiz bazen "36.187..." değerini "36187..." olarak (noktasız) gönderir
  if (Math.abs(n) > 180) {
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length > 2) {
      n = parseFloat(`${digits.slice(0, 2)}.${digits.slice(2)}`);
    }
  }

  if (!Number.isFinite(n) || Math.abs(n) > 180) return null;
  return n;
}

/** "100 Km", "4 km", "500 m", "1,5 km" → kilometre */
export function parseDistanceToKm(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(",", ".")
    .replace(/\s+/g, " ");

  const match = normalized.match(/([\d.]+)\s*(km|m|metre|meter)?/);
  if (!match) return null;

  const value = parseFloat(match[1]);
  if (!Number.isFinite(value) || value < 0) return null;

  const unit = match[2] ?? "km";
  if (unit === "m" || unit === "metre" || unit === "meter") {
    return Math.round((value / 1000) * 1000) / 1000;
  }
  return Math.round(value * 1000) / 1000;
}

export function buildLocationLabel(
  address: TatildeyizPropertyAddress | null | undefined
): string | null {
  if (!address) return null;
  const neighborhood = address.Neighborhood;
  const district = neighborhood?.District;
  const town = district?.Town;
  const city = town?.City;

  const parts = [
    neighborhood?.title,
    district?.title,
    town?.title,
    city?.title,
  ].filter((part): part is string => Boolean(part?.trim()));

  if (parts.length === 0) {
    return address.address?.trim() || null;
  }

  // Mahalle, İlçe/Belde, İl — tekrarları at
  const unique: string[] = [];
  for (const part of parts) {
    if (!unique.some((item) => item.toLocaleLowerCase("tr-TR") === part.toLocaleLowerCase("tr-TR"))) {
      unique.push(part.trim());
    }
  }
  return unique.join(", ");
}

type LocationCache = {
  categoryBySlug: Map<string, { id: string; name: string }>;
  locationBySlug: Map<string, { id: string; name: string; categoryId: string }>;
};

async function loadLocationCache(prisma: PrismaClient): Promise<LocationCache> {
  const [categories, locations] = await Promise.all([
    prisma.surroundingCategory.findMany({
      select: { id: true, name: true, slug: true },
    }),
    prisma.surroundingLocation.findMany({
      select: { id: true, name: true, categoryId: true },
    }),
  ]);

  return {
    categoryBySlug: new Map(
      categories.map((item) => [item.slug, { id: item.id, name: item.name }])
    ),
    locationBySlug: new Map(
      locations.map((item) => [
        toSurroundingSlug(item.name),
        { id: item.id, name: item.name, categoryId: item.categoryId },
      ])
    ),
  };
}

async function ensureSurroundingLocation(
  prisma: PrismaClient,
  cache: LocationCache,
  location: TatildeyizPropertyLocation,
  dryRun: boolean
): Promise<{ id: string; createdCategory: boolean; createdLocation: boolean } | null> {
  const typeName = location.locationType?.name?.trim();
  if (!typeName) return null;

  const categoryName =
    location.locationType?.locationCategory?.name?.trim() || "Yakın Yerler";
  const categorySlug = toSurroundingSlug(categoryName) || "yakin-yerler";
  const locationSlug = toSurroundingSlug(typeName);
  if (!locationSlug) return null;

  let createdCategory = false;
  let createdLocation = false;

  let category = cache.categoryBySlug.get(categorySlug);
  if (!category) {
    createdCategory = true;
    if (!dryRun) {
      const maxOrder = await prisma.surroundingCategory.aggregate({
        _max: { sortOrder: true },
      });
      const created = await prisma.surroundingCategory.create({
        data: {
          name: categoryName,
          slug: categorySlug,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          active: true,
        },
        select: { id: true, name: true },
      });
      category = created;
      cache.categoryBySlug.set(categorySlug, category);
    } else {
      category = { id: `dry-cat-${categorySlug}`, name: categoryName };
      cache.categoryBySlug.set(categorySlug, category);
    }
  }

  let surrounding = cache.locationBySlug.get(locationSlug);
  if (!surrounding) {
    createdLocation = true;
    if (!dryRun) {
      const maxOrder = await prisma.surroundingLocation.aggregate({
        where: { categoryId: category.id },
        _max: { sortOrder: true },
      });
      const created = await prisma.surroundingLocation.create({
        data: {
          name: typeName,
          categoryId: category.id,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          active: true,
        },
        select: { id: true, name: true, categoryId: true },
      });
      surrounding = created;
      cache.locationBySlug.set(locationSlug, surrounding);
    } else {
      surrounding = {
        id: `dry-loc-${locationSlug}`,
        name: typeName,
        categoryId: category.id,
      };
      cache.locationBySlug.set(locationSlug, surrounding);
    }
  }

  return {
    id: surrounding.id,
    createdCategory,
    createdLocation,
  };
}

export async function applyTatildeyizLocationToVilla(
  prisma: PrismaClient,
  slug: string,
  options: { dryRun?: boolean; force?: boolean; cache?: LocationCache } = {}
): Promise<ImportVillaLocationResult> {
  const dryRun = options.dryRun === true;
  const force = options.force === true;

  const villa = await prisma.villa.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      villaId: true,
      latitude: true,
      longitude: true,
      location: true,
      _count: { select: { surroundingDistances: true } },
    },
  });

  if (!villa) {
    return { slug, status: "error", error: "Villa veritabanında yok" };
  }

  const hasCoords =
    Number.isFinite(villa.latitude) &&
    Number.isFinite(villa.longitude) &&
    !(villa.latitude === 0 && villa.longitude === 0);
  const hasDistances = villa._count.surroundingDistances > 0;

  if (!force && hasCoords && hasDistances) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "skipped",
      latitude: villa.latitude,
      longitude: villa.longitude,
      distanceCount: villa._count.surroundingDistances,
      error: "Konum ve mesafeler zaten dolu (force ile üzerine yazılır)",
    };
  }

  let property: TatildeyizProperty;
  try {
    property = await fetchTatildeyizPropertyWithDelay(slug);
  } catch (error) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "error",
      error: error instanceof Error ? error.message : "Kaynak alınamadı",
    };
  }

  let latitude = parseCoordinate(property.address?.latitude);
  let longitude = parseCoordinate(property.address?.longitude);
  if (latitude === 0 && longitude === 0) {
    latitude = null;
    longitude = null;
  }
  const locationLabel = buildLocationLabel(property.address);
  const sourceLocations = property.locations ?? [];

  const cache = options.cache ?? (await loadLocationCache(prisma));
  let createdCategories = 0;
  let createdLocations = 0;

  const distanceRows: { surroundingLocationId: string; distanceKm: number }[] =
    [];

  for (const item of sourceLocations) {
    const distanceKm = parseDistanceToKm(item.distance);
    if (distanceKm == null) continue;

    const ensured = await ensureSurroundingLocation(
      prisma,
      cache,
      item,
      dryRun
    );
    if (!ensured) continue;

    if (ensured.createdCategory) createdCategories += 1;
    if (ensured.createdLocation) createdLocations += 1;

    if (!dryRun) {
      distanceRows.push({
        surroundingLocationId: ensured.id,
        distanceKm,
      });
    } else {
      distanceRows.push({
        surroundingLocationId: ensured.id,
        distanceKm,
      });
    }
  }

  // Aynı konum tipi birden fazla gelirse son değeri kullan
  const uniqueDistances = new Map<string, number>();
  for (const row of distanceRows) {
    uniqueDistances.set(row.surroundingLocationId, row.distanceKm);
  }

  if (!dryRun) {
    const updateData: {
      latitude?: number;
      longitude?: number;
      location?: string;
    } = {};

    if (
      latitude != null &&
      longitude != null &&
      !(latitude === 0 && longitude === 0)
    ) {
      updateData.latitude = latitude;
      updateData.longitude = longitude;
    }
    if (locationLabel) {
      updateData.location = locationLabel;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.villa.update({
        where: { id: villa.id },
        data: updateData,
      });
    }

    if (uniqueDistances.size > 0) {
      await prisma.villaSurroundingDistance.deleteMany({
        where: { villaId: villa.id },
      });
      await prisma.villaSurroundingDistance.createMany({
        data: Array.from(uniqueDistances.entries()).map(
          ([surroundingLocationId, distanceKm]) => ({
            villaId: villa.id,
            surroundingLocationId,
            distanceKm,
          })
        ),
      });
    }
  }

  if (
    latitude == null &&
    longitude == null &&
    uniqueDistances.size === 0
  ) {
    return {
      slug,
      villaId: villa.id,
      dbVillaId: villa.villaId,
      name: villa.name,
      status: "skipped",
      error: "Kaynakta konum/mesafe verisi yok",
    };
  }

  return {
    slug,
    villaId: villa.id,
    dbVillaId: villa.villaId,
    name: villa.name,
    status: "success",
    latitude,
    longitude,
    locationLabel,
    distanceCount: uniqueDistances.size,
    createdCategories,
    createdLocations,
  };
}

export async function createSharedLocationCache(prisma: PrismaClient) {
  return loadLocationCache(prisma);
}
