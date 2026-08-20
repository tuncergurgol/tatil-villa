import { RegionLevel } from "@/lib/region-levels";

export type SurroundingRegionScope = {
  id: string;
  name: string;
  level: string;
};

/** Villa bölgesinin il (ve varsa ilçe) id'lerini çıkarır. */
export function collectVillaRegionAncestorIds(
  regions: Array<{ id: string; level: string; parentId: string | null }>,
  villaRegionId: string | null | undefined
): string[] {
  if (!villaRegionId) return [];
  const byId = new Map(regions.map((region) => [region.id, region]));
  const ids: string[] = [];
  let current = byId.get(villaRegionId);
  while (current) {
    ids.push(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return ids;
}

/**
 * Konum bu villa bölgesinde listelenir mi?
 * regionScopes boşsa tüm bölgelerde geçerlidir.
 * Doluysa villa'nın il/ilçe/mahalle zincirinden biri eşleşmeli.
 */
export function surroundingLocationMatchesRegion(
  scopeRegionIds: string[],
  villaAncestorIds: string[]
): boolean {
  if (scopeRegionIds.length === 0) return true;
  if (villaAncestorIds.length === 0) return false;
  const villaSet = new Set(villaAncestorIds);
  return scopeRegionIds.some((id) => villaSet.has(id));
}

export function parseLatLngPaste(raw: string): {
  latitude: number;
  longitude: number;
} | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/
  );
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

export function isValidLatLng(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return false;
  }
  if (latitude === 0 && longitude === 0) return false;
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function filterIlRegions<
  T extends { level: string; name: string },
>(regions: T[]): T[] {
  return regions
    .filter((region) => region.level === RegionLevel.IL)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}
