export const RegionLevel = {
  IL: "IL",
  ILCE: "ILCE",
  MAHALLE: "MAHALLE",
} as const;

export type RegionLevel = (typeof RegionLevel)[keyof typeof RegionLevel];

export const REGION_LEVEL_LABELS: Record<RegionLevel, string> = {
  IL: "İl",
  ILCE: "İlçe",
  MAHALLE: "Mahalle",
};

export const REGION_LEVEL_ORDER: RegionLevel[] = [
  RegionLevel.IL,
  RegionLevel.ILCE,
  RegionLevel.MAHALLE,
];

export function parentLevelFor(level: RegionLevel): RegionLevel | null {
  switch (level) {
    case RegionLevel.IL:
      return null;
    case RegionLevel.ILCE:
      return RegionLevel.IL;
    case RegionLevel.MAHALLE:
      return RegionLevel.ILCE;
    default:
      return null;
  }
}

export function childLevelFor(level: RegionLevel): RegionLevel | null {
  switch (level) {
    case RegionLevel.IL:
      return RegionLevel.ILCE;
    case RegionLevel.ILCE:
      return RegionLevel.MAHALLE;
    case RegionLevel.MAHALLE:
      return null;
    default:
      return null;
  }
}

export function isValidParentLevel(
  childLevel: RegionLevel,
  parentLevel: RegionLevel | null
): boolean {
  const expected = parentLevelFor(childLevel);
  if (expected === null) return parentLevel === null;
  return parentLevel === expected;
}

export function isRegionActive(region: { published: boolean }): boolean {
  return region.published;
}

export function levelBadgeClass(level: RegionLevel): string {
  switch (level) {
    case RegionLevel.IL:
      return "bg-blue-50 text-blue-700";
    case RegionLevel.ILCE:
      return "bg-violet-50 text-violet-700";
    case RegionLevel.MAHALLE:
      return "bg-teal-50 text-teal-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
