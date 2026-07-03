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
] as const;

export function formatBedSummary(singleBeds: number, doubleBeds: number) {
  const parts: string[] = [];
  if (doubleBeds > 0) {
    parts.push(`${doubleBeds} Çift`);
  }
  if (singleBeds > 0) {
    parts.push(`${singleBeds} Tek`);
  }
  return parts.length > 0 ? parts.join(", ") : "Yatak yok";
}

export function getRoomTypeLabel(roomType: string) {
  return (
    ROOM_TYPE_OPTIONS.find((option) => option.value === roomType)?.label ??
    "Yatak Odası"
  );
}

export function getRoomFeatureOptions(
  customFeatures: string[]
): string[] {
  const merged = [...DEFAULT_ROOM_FEATURES, ...customFeatures];
  return Array.from(new Set(merged));
}
