export const DEFAULT_ROOM_FEATURES = [
  "Bebek Yatağı",
  "Ortak Banyo",
  "Özel Banyo",
  "Klima",
  "Elbise Dolabı",
  "Havlu & Nevresim",
  "Televizyon",
  "Balkon",
  "Teras",
  "Şömine",
  "Jakuzi",
  "Sauna",
  "Türk Hamamı",
  "Kapalı Havuz",
  "Ana Bina Dışında Bağımsız Oda",
] as const;

export const ROOM_TYPE_OPTIONS = [
  { value: "yatak_odasi", label: "Yatak Odası" },
  { value: "salon", label: "Salon" },
  { value: "mutfak", label: "Mutfak" },
  { value: "banyo", label: "Banyo" },
] as const;

export function formatBedSummary(singleBeds: number, doubleBeds: number) {
  const parts: string[] = [];
  if (doubleBeds > 0) {
    parts.push(`${doubleBeds} Çift Kişilik Yatak`);
  }
  if (singleBeds > 0) {
    parts.push(`${singleBeds} Tek Kişilik Yatak`);
  }
  return parts.length > 0 ? parts.join(", ") : "Yatak yok";
}

export function getRoomTypeLabel(roomType: string) {
  return (
    ROOM_TYPE_OPTIONS.find((option) => option.value === roomType)?.label ??
    "Yatak Odası"
  );
}

export function roomFeatureKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
}

export function sortRoomFeatures(features: string[]): string[] {
  return [...features].sort((a, b) =>
    a.localeCompare(b, "tr", { sensitivity: "base" })
  );
}

function isAllCapsLabel(value: string) {
  const letters = value.replace(/[^\p{L}]/gu, "");
  if (!letters) return false;
  return letters === letters.toLocaleUpperCase("tr");
}

export function uniqueRoomFeatures(features: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of features) {
    const trimmed = raw.trim().replace(/\s+/g, " ");
    if (!trimmed) continue;
    const key = roomFeatureKey(trimmed);
    const canonicalDefault = DEFAULT_ROOM_FEATURES.find(
      (feature) => roomFeatureKey(feature) === key
    );
    const next = canonicalDefault ?? trimmed;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, next);
      continue;
    }
    if (canonicalDefault) {
      seen.set(key, canonicalDefault);
      continue;
    }
    if (isAllCapsLabel(existing) && !isAllCapsLabel(next)) {
      seen.set(key, next);
    }
  }
  return sortRoomFeatures([...seen.values()]);
}

export function isDefaultRoomFeature(value: string) {
  const key = roomFeatureKey(value);
  return DEFAULT_ROOM_FEATURES.some((feature) => roomFeatureKey(feature) === key);
}

export function roomHasFeature(features: string[], feature: string) {
  const key = roomFeatureKey(feature);
  return features.some((item) => roomFeatureKey(item) === key);
}

export function toggleRoomFeature(features: string[], feature: string) {
  if (roomHasFeature(features, feature)) {
    return uniqueRoomFeatures(
      features.filter((item) => roomFeatureKey(item) !== roomFeatureKey(feature))
    );
  }
  return uniqueRoomFeatures([...features, feature]);
}

export function getRoomFeatureOptions(
  customFeatures: string[],
  selectedFeatures: string[] = []
): string[] {
  return uniqueRoomFeatures([
    ...DEFAULT_ROOM_FEATURES,
    ...customFeatures,
    ...selectedFeatures,
  ]);
}
