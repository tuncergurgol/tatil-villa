import sharp from "sharp";

export const MAX_VILLA_GALLERY_BYTES = 100 * 1024;
const MIN_WEBP_QUALITY = 15;

function pickStartEdge(longestEdge: number, byteLength: number) {
  if (byteLength > 4_000_000 || longestEdge > 2800) return 960;
  if (byteLength > 2_000_000 || longestEdge > 2200) return 1100;
  if (byteLength > 900_000 || longestEdge > 1600) return 1200;
  if (longestEdge > 0) return Math.min(longestEdge, 1200);
  return 1100;
}

function buildResizedPipeline(buffer: Buffer, maxEdge: number) {
  return sharp(buffer, { failOn: "none", sequentialRead: true })
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    });
}

async function encodeWebp(
  buffer: Buffer,
  maxEdge: number,
  qualities: readonly number[],
  maxBytes: number
) {
  const pipeline = buildResizedPipeline(buffer, maxEdge);
  for (const quality of qualities) {
    const encoded = await pipeline
      .clone()
      .webp({ quality, effort: 2, smartSubsample: true })
      .toBuffer();
    if (encoded.length <= maxBytes) return encoded;
  }
  return null;
}

/** Villa galeri görsellerini WebP'ye çevirir; hedef 100 KB altı. */
export async function processGalleryImageToWebp(
  buffer: Buffer,
  maxBytes = MAX_VILLA_GALLERY_BYTES
) {
  const metadata = await sharp(buffer, { failOn: "none" }).metadata();
  const longestEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  const startEdge = pickStartEdge(longestEdge, buffer.length);
  const fastQualities = [56, 40, 28, MIN_WEBP_QUALITY] as const;
  const fallbackQualities = [36, 24, MIN_WEBP_QUALITY] as const;

  const primary = await encodeWebp(buffer, startEdge, fastQualities, maxBytes);
  if (primary) return primary;

  const fallbackEdge = Math.max(280, Math.round(startEdge * 0.72));
  if (fallbackEdge < startEdge) {
    const fallback = await encodeWebp(
      buffer,
      fallbackEdge,
      fallbackQualities,
      maxBytes
    );
    if (fallback) return fallback;
  }

  const emergency = await buildResizedPipeline(buffer, 240)
    .webp({ quality: MIN_WEBP_QUALITY, effort: 2, smartSubsample: true })
    .toBuffer();
  if (emergency.length <= maxBytes) return emergency;

  throw new Error(
    `Görsel ${Math.ceil(emergency.length / 1024)} KB; ${Math.ceil(maxBytes / 1024)} KB altına indirilemedi`
  );
}
