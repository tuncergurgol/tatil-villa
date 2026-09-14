export type VillaRoomInfoSnapshot = {
  features: string[];
  customFeatures: string[];
  imageUrl: string;
};

export function getVillaRoomInfoStatusLabels(
  bedrooms: number,
  rooms: VillaRoomInfoSnapshot[]
): string[] {
  if (bedrooms <= 0) return [];

  const labels: string[] = [];
  const hasMissingFeatures = rooms.some(
    (room) => room.features.length === 0 && room.customFeatures.length === 0
  );
  const hasMissingPhoto = rooms.some((room) => !room.imageUrl.trim());

  if (hasMissingFeatures || rooms.length < bedrooms) {
    labels.push("Oda Bilgileri Eksik");
  }
  if (hasMissingPhoto) {
    labels.push("Foto Eksik");
  }

  return labels;
}

export function formatVillaRoomInfoStatus(
  bedrooms: number,
  rooms: VillaRoomInfoSnapshot[]
) {
  const labels = getVillaRoomInfoStatusLabels(bedrooms, rooms);
  if (bedrooms <= 0) return "—";
  if (labels.length === 0) return "Tamam";
  return labels.join(" · ");
}
