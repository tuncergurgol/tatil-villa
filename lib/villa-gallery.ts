export function getVillaGalleryImages(villa: {
  images: string[];
  image: string;
}) {
  if (villa.images.length > 0) return villa.images;
  if (villa.image) return [villa.image];
  return [];
}
