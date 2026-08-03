import sharp from "sharp";

export const MAX_VILLA_GALLERY_BYTES = 100 * 1024;
const RESIZE_STEPS = [1600, 1200, 960, 720, 560, 420, 320, 260] as const;
const MIN_WEBP_QUALITY = 15;
const MAX_WEBP_QUALITY = 82;
const MIN_EDGE_PX = 200;

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
      effort: 4,
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

  if (best) return best;

  const minimum = await encodeGalleryWebp(buffer, maxEdge, MIN_WEBP_QUALITY);
  return minimum.length <= maxBytes ? minimum : null;
}

/** Villa galeri görsellerini WebP'ye çevirir; hedef 100 KB altı. */
export async function processGalleryImageToWebp(
  buffer: Buffer,
  maxBytes = MAX_VILLA_GALLERY_BYTES
) {
  let smallest: Buffer | null = null;

  for (const maxEdge of RESIZE_STEPS) {
    const encoded = await encodeUnderByteLimit(buffer, maxEdge, maxBytes);
    if (encoded) return encoded;

    const fallback = await encodeGalleryWebp(
      buffer,
      maxEdge,
      MIN_WEBP_QUALITY
    );
    if (!smallest || fallback.length < smallest.length) {
      smallest = fallback;
    }
  }

  for (
    let edge = RESIZE_STEPS[RESIZE_STEPS.length - 1] - 40;
    edge >= MIN_EDGE_PX;
    edge -= 40
  ) {
    const encoded = await encodeGalleryWebp(buffer, edge, MIN_WEBP_QUALITY);
    if (!smallest || encoded.length < smallest.length) {
      smallest = encoded;
    }
    if (encoded.length <= maxBytes) return encoded;
  }

  if (smallest && smallest.length <= maxBytes) return smallest;

  throw new Error(
    `Görsel ${Math.ceil((smallest?.length ?? 0) / 1024)} KB; ${Math.ceil(maxBytes / 1024)} KB altına indirilemedi`
  );
}
