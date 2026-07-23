import sharp from "sharp";

export const MAX_VILLA_GALLERY_BYTES = 100 * 1024;
const MIN_VILLA_GALLERY_BYTES = 90 * 1024;
const MAX_GALLERY_EDGE = 1920;
const MIN_GALLERY_EDGE = 720;
const INITIAL_WEBP_QUALITY = 82;
const MIN_WEBP_QUALITY = 35;

async function encodeGalleryWebp(
  buffer: Buffer,
  maxEdge: number,
  quality: number
) {
  return sharp(buffer)
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer();
}

/** Villa galeri görsellerini WebP'ye çevirir; hedef 100 KB altı. */
export async function processGalleryImageToWebp(
  buffer: Buffer,
  maxBytes = MAX_VILLA_GALLERY_BYTES
) {
  let maxEdge = MAX_GALLERY_EDGE;
  let quality = INITIAL_WEBP_QUALITY;
  let output = await encodeGalleryWebp(buffer, maxEdge, quality);

  while (output.length > maxBytes && quality > MIN_WEBP_QUALITY) {
    quality -= 5;
    output = await encodeGalleryWebp(buffer, maxEdge, quality);
  }

  while (output.length > maxBytes && maxEdge > MIN_GALLERY_EDGE) {
    maxEdge = Math.max(MIN_GALLERY_EDGE, Math.floor(maxEdge * 0.85));
    quality = INITIAL_WEBP_QUALITY;

    output = await encodeGalleryWebp(buffer, maxEdge, quality);
    while (output.length > maxBytes && quality > MIN_WEBP_QUALITY) {
      quality -= 5;
      output = await encodeGalleryWebp(buffer, maxEdge, quality);
    }
  }

  if (output.length > maxBytes) {
    throw new Error(
      `Görsel ${Math.ceil(output.length / 1024)} KB; ${Math.ceil(maxBytes / 1024)} KB altına indirilemedi`
    );
  }

  if (output.length > MIN_VILLA_GALLERY_BYTES && quality > MIN_WEBP_QUALITY + 5) {
    let tunedQuality = quality + 5;
    let tunedOutput = await encodeGalleryWebp(buffer, maxEdge, tunedQuality);
    while (
      tunedOutput.length <= maxBytes &&
      tunedQuality < INITIAL_WEBP_QUALITY
    ) {
      output = tunedOutput;
      quality = tunedQuality;
      tunedQuality += 5;
      tunedOutput = await encodeGalleryWebp(buffer, maxEdge, tunedQuality);
    }
  }

  return output;
}
