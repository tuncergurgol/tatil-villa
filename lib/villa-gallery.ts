export type VillaImageFields = {
  images: string[];
  image: string;
};

/** Galeri sırasındaki 1. görsel vitrin resmidir. */
export function getVillaGalleryImages(villa: VillaImageFields): string[] {
  if (villa.images.length > 0) return villa.images;
  if (villa.image) return [villa.image];
  return [];
}

export function getVillaShowcaseImage(villa: VillaImageFields): string {
  return getVillaGalleryImages(villa)[0] ?? "";
}

export function mapVillaShowcaseImage<T extends VillaImageFields>(
  villa: T
): T & { image: string } {
  return {
    ...villa,
    image: getVillaShowcaseImage(villa),
  };
}
