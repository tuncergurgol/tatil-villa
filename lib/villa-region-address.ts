import { RegionLevel } from "@/lib/region-levels";

export type VillaRegionAddress = {
  il: string;
  ilce: string;
  mahalle: string;
};

type RegionNode = {
  name: string;
  level: string;
  parent?: {
    name: string;
    level: string;
    parent?: { name: string; level: string } | null;
  } | null;
};

export function resolveVillaRegionAddress(region: RegionNode): VillaRegionAddress {
  if (region.level === RegionLevel.MAHALLE) {
    return {
      mahalle: region.name,
      ilce: region.parent?.name ?? "",
      il: region.parent?.parent?.name ?? "",
    };
  }

  if (region.level === RegionLevel.ILCE) {
    return {
      mahalle: "",
      ilce: region.name,
      il: region.parent?.name ?? "",
    };
  }

  return {
    mahalle: "",
    ilce: "",
    il: region.name,
  };
}
