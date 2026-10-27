import { isFeaturedAmenityCategory, sortAmenityNamesTr } from "@/lib/amenity-featured";
import {
  formatDescriptionDistanceKm,
  type VillaDescriptionContext,
} from "@/lib/villa-description-generator";
import type { VillaDetail } from "@/lib/queries/villa-detail";

/** Public villa detayından EN/TR açıklama şablonu için bağlam üretir. */
export function buildVillaDescriptionContextFromDetail(
  villa: VillaDetail
): VillaDescriptionContext {
  const regionParts = villa.regionLabel
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);

  const featuredAmenities = sortAmenityNamesTr(
    villa.amenityGroups.find((group) =>
      isFeaturedAmenityCategory(group.category)
    )?.items ?? []
  );

  const otherAmenities = villa.amenityGroups
    .filter((group) => !isFeaturedAmenityCategory(group.category))
    .flatMap((group) => group.items);

  const distances = villa.distances.flatMap((group) =>
    group.items.map((item) => ({
      category: group.category,
      name: item.name,
      distanceLabel:
        item.distanceLabel || formatDescriptionDistanceKm(item.distanceKm),
    }))
  );

  const minStayCandidates = villa.periods
    .map((period) => period.minStayNights)
    .filter((value): value is number => typeof value === "number" && value > 0)
    .sort((a, b) => a - b);

  return {
    name: villa.name,
    region: villa.regionLabel,
    regionMahalle: regionParts[2] ?? regionParts[regionParts.length - 1] ?? "",
    regionIlce: regionParts[1] ?? "",
    regionIl: regionParts[0] ?? "",
    extraInfo: "",
    facilityType: villa.category,
    guests: villa.guests,
    extraCapacity: villa.extraCapacity,
    livingRooms: villa.livingRooms,
    bedrooms: villa.bedrooms,
    bathrooms: villa.bathrooms,
    amenityCount: villa.amenities.length,
    childFriendly: villa.allowChildren,
    allowPets: villa.allowPets,
    allowSmoking: villa.allowSmoking,
    customRules: villa.customRules,
    minStayNights: minStayCandidates[0] ?? null,
    featuredAmenities,
    amenities: otherAmenities,
    location: villa.location || regionParts[regionParts.length - 1] || "",
    distances,
  };
}
