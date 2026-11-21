/** Havuz Bilgileri → Özellikler sekmesi amenity senkronu (yalnızca ekleme). */

export const HEATED_POOL_AMENITY_NAME = "Isıtmalı Havuz";

/**
 * Misafir yalnızca "havuz" dediyse tür belirtilmemiş demektir.
 * Arama, aşağıdaki dört türden herhangi birini yeterli sayar.
 */
export const GENERIC_POOL_REQUEST = "Havuz";

export const ANY_POOL_TYPES = [
  "Özel Havuz",
  "Kapalı Havuz",
  "Çocuk Havuzu",
  "Ortak Havuz",
] as const;

export const ANY_POOL_AMENITY_NAMES = [
  "Özel Havuzlu",
  "Kapalı Havuz",
  "Çocuk Havuzu",
  "Ortak Havuz",
] as const;

export const ANY_POOL_FACILITY_CATEGORIES = [
  "Özel Havuzlu Villalar",
  "Kapalı Havuzlu Villalar",
  "Çocuk Havuzlu Villalar",
] as const;

/** poolType (Havuz Bilgileri) → Amenity.name (Özellikler) */
export const POOL_TYPE_TO_AMENITY_NAME: Record<string, string> = {
  "Özel Havuz": "Özel Havuzlu",
  "Ortak Havuz": "Ortak Havuz",
  "Çocuk Havuzu": "Çocuk Havuzu",
  "Kapalı Havuz": "Kapalı Havuz",
};

export function isGenericPoolRequestName(name: string) {
  const folded = name.trim().toLocaleLowerCase("tr-TR");
  return folded === "havuz" || folded === "havuzu";
}

/** Dört havuz türünden en az biri olan villa. */
export function anyPoolMatchWhere() {
  return {
    OR: [
      { amenities: { hasSome: [...ANY_POOL_AMENITY_NAMES] } },
      { facilityCategories: { hasSome: [...ANY_POOL_FACILITY_CATEGORIES] } },
      { pools: { some: { poolType: { in: [...ANY_POOL_TYPES] } } } },
    ],
  };
}

export type PoolAmenitySource = {
  poolType: string | null | undefined;
  heated?: boolean | null;
};

function normalizeAmenityKey(name: string): string {
  return name.trim().toLocaleLowerCase("tr-TR");
}

export function amenityNamesRequiredByPools(
  pools: PoolAmenitySource[]
): string[] {
  const required = new Set<string>();
  for (const pool of pools) {
    const poolType = (pool.poolType ?? "").trim();
    if (poolType) {
      const mapped = POOL_TYPE_TO_AMENITY_NAME[poolType] ?? poolType;
      if (mapped) required.add(mapped);
    }
    if (pool.heated) {
      required.add(HEATED_POOL_AMENITY_NAME);
    }
  }
  return [...required];
}

/** Mevcut özelliklere havuzlardan gelenleri ekler; elle işaretlenmişleri silmez. */
export function mergeAmenitiesWithPools(
  amenities: string[],
  pools: PoolAmenitySource[]
): string[] {
  const next = [...amenities];
  const existing = new Set(
    amenities.map((name) => normalizeAmenityKey(name)).filter(Boolean)
  );

  for (const name of amenityNamesRequiredByPools(pools)) {
    const key = normalizeAmenityKey(name);
    if (!key || existing.has(key)) continue;
    next.push(name);
    existing.add(key);
  }

  return next;
}

export function amenitiesChanged(
  before: string[],
  after: string[]
): boolean {
  if (before.length !== after.length) return true;
  const beforeKeys = new Set(before.map(normalizeAmenityKey));
  return after.some((name) => !beforeKeys.has(normalizeAmenityKey(name)));
}
