import { RegionLevel } from "@/lib/region-levels";

export type RegionPickerOption = {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
};

export type SurroundingLocationOption = {
  id: string;
  name: string;
  categoryName: string;
  sortOrder: number;
};

export function resolveRegionHierarchy(
  regions: RegionPickerOption[],
  regionId: string
) {
  const byId = new Map(regions.map((region) => [region.id, region]));
  const mahalle = byId.get(regionId);

  if (!mahalle || mahalle.level !== RegionLevel.MAHALLE) {
    return { ilId: "", ilceId: "", mahalleId: regionId };
  }

  const ilce = mahalle.parentId ? byId.get(mahalle.parentId) : undefined;
  const il =
    ilce?.parentId && byId.get(ilce.parentId)?.level === RegionLevel.IL
      ? byId.get(ilce.parentId)
      : undefined;

  return {
    ilId: il?.id ?? "",
    ilceId: ilce?.id ?? "",
    mahalleId: mahalle.id,
  };
}

export function buildRegionSelectionLabel(
  regions: RegionPickerOption[],
  ilId: string,
  ilceId: string,
  mahalleId: string,
  location: string
) {
  const byId = new Map(regions.map((region) => [region.id, region]));
  const parts = [
    byId.get(ilId)?.name,
    byId.get(ilceId)?.name,
    byId.get(mahalleId)?.name || location,
  ].filter(Boolean);

  return parts.join(" > ");
}

/** Public kart/detay için: İl - İlçe - Mahalle */
export function formatVillaRegionLabel(region: {
  name: string;
  parent?: {
    name: string;
    parent?: { name: string } | null;
  } | null;
}): string {
  return [region.parent?.parent?.name, region.parent?.name, region.name]
    .filter(Boolean)
    .join(" - ");
}

/** Rezervasyon belgesi için: Mahalle, İlçe, İl */
export function formatVillaRegionLabelMahalleIlceIl(region: {
  name: string;
  parent?: {
    name: string;
    parent?: { name: string } | null;
  } | null;
}): string {
  return [region.name, region.parent?.name, region.parent?.parent?.name]
    .filter(Boolean)
    .join(", ");
}
