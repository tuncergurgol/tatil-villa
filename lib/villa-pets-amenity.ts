/** Özellikler sekmesindeki “Evcil Hayvan İzinli” ile kurallar `allowPets` senkronu */

export const PET_ALLOWED_AMENITY_NAME = "Evcil Hayvan İzinli";

export function amenitiesAllowPets(amenities: string[]): boolean {
  return amenities.some(
    (name) => name.trim().toLocaleLowerCase("tr-TR") ===
      PET_ALLOWED_AMENITY_NAME.toLocaleLowerCase("tr-TR")
  );
}

/** Kurallar kaydında allowPets true/false iken amenity listesini hizala */
export function syncAmenitiesWithAllowPets(
  amenities: string[],
  allowPets: boolean
): string[] {
  const hasPetAmenity = amenitiesAllowPets(amenities);
  if (allowPets && !hasPetAmenity) {
    return [...amenities, PET_ALLOWED_AMENITY_NAME];
  }
  if (!allowPets && hasPetAmenity) {
    return amenities.filter(
      (name) =>
        name.trim().toLocaleLowerCase("tr-TR") !==
        PET_ALLOWED_AMENITY_NAME.toLocaleLowerCase("tr-TR")
    );
  }
  return amenities;
}
