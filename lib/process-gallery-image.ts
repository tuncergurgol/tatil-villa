import sharp from "sharp";

const MAX_GALLERY_EDGE = 2400;

export async function processGalleryImageToWebp(buffer: Buffer) {
  return sharp(buffer)
    .rotate()
    .resize({
      width: MAX_GALLERY_EDGE,
      height: MAX_GALLERY_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();
}
