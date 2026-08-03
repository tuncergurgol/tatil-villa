import sharp from "sharp";

export const MAX_VILLA_GALLERY_BYTES = 100 * 1024;
const PRIMARY_RESIZE_STEPS = [1400, 1100, 820, 620] as const;
const FALLBACK_RESIZE_STEPS = [480, 360, 280, 220] as const;
const MIN_WEBP_QUALITY = 15;
const QUALITY_STEPS = [68, 54, 42, 32, 24, MIN_WEBP_QUALITY] as const;

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

function resolveResizeSteps(longestEdge: number) {
  const primary = PRIMARY_RESIZE_STEPS.filter(
    (edge) => longestEdge === 0 || edge <= longestEdge + 80
  );
  const fallbacks = FALLBACK_RESIZE_STEPS.filter(
    (edge) => primary.length === 0 || edge < primary[primary.length - 1]!
  );

  if (primary.length > 0) {
    return [...primary, ...fallbacks];
  }

  const nativeEdge = Math.max(longestEdge, FALLBACK_RESIZE_STEPS[0]!);
  return [nativeEdge, ...fallbacks.filter((edge) => edge < nativeEdge)];
}

async function tryEncodeUnderLimit(
  buffer: Buffer,
  maxEdge: number,
  maxBytes: number
) {
  const pipeline = buildResizedPipeline(buffer, maxEdge);

  for (const quality of QUALITY_STEPS) {
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
  const resizeSteps = resolveResizeSteps(longestEdge);

  let smallest: Buffer | null = null;

  for (const maxEdge of resizeSteps) {
    const encoded = await tryEncodeUnderLimit(buffer, maxEdge, maxBytes);
    if (encoded) return encoded;

    const minimum = await buildResizedPipeline(buffer, maxEdge)
      .webp({ quality: MIN_WEBP_QUALITY, effort: 2, smartSubsample: true })
      .toBuffer();
    if (!smallest || minimum.length < smallest.length) {
      smallest = minimum;
    }
    if (minimum.length <= maxBytes) return minimum;
  }

  if (smallest && smallest.length <= maxBytes) return smallest;

  throw new Error(
    `Görsel ${Math.ceil((smallest?.length ?? 0) / 1024)} KB; ${Math.ceil(maxBytes / 1024)} KB altına indirilemedi`
  );
}
