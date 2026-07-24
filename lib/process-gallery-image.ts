import sharp from "sharp";

export const MAX_VILLA_GALLERY_BYTES = 100 * 1024;
const RESIZE_STEPS = [1600, 1200, 900] as const;
const MIN_WEBP_QUALITY = 35;
const MAX_WEBP_QUALITY = 80;

async function encodeGalleryWebp(
  buffer: Buffer,
  maxEdge: number,
  quality: number
) {
  return sharp(buffer, { failOn: "none", sequentialRead: true })
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 2,
      smartSubsample: true,
    })
    .toBuffer();
}

async function encodeUnderByteLimit(
  buffer: Buffer,
  maxEdge: number,
  maxBytes: number
) {
  let low = MIN_WEBP_QUALITY;
  let high = MAX_WEBP_QUALITY;
  let best: Buffer | null = null;

  while (low <= high) {
    const quality = Math.floor((low + high) / 2);
    const encoded = await encodeGalleryWebp(buffer, maxEdge, quality);
    if (encoded.length <= maxBytes) {
      best = encoded;
      low = quality + 1;
    } else {
      high = quality - 1;
    }
  }

  return best;
}

/** Villa galeri görsellerini WebP'ye çevirir; hedef 100 KB altı. */
export async function processGalleryImageToWebp(
  buffer: Buffer,
  maxBytes = MAX_VILLA_GALLERY_BYTES
) {
  for (const maxEdge of RESIZE_STEPS) {
    const encoded = await encodeUnderByteLimit(buffer, maxEdge, maxBytes);
    if (encoded) return encoded;
  }

  const fallback = await encodeGalleryWebp(
    buffer,
    RESIZE_STEPS[RESIZE_STEPS.length - 1],
    MIN_WEBP_QUALITY
  );
  if (fallback.length <= maxBytes) return fallback;

  throw new Error(
    `Görsel ${Math.ceil(fallback.length / 1024)} KB; ${Math.ceil(maxBytes / 1024)} KB altına indirilemedi`
  );
}
