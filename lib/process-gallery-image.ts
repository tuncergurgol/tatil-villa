import sharp from "sharp";

export const MAX_VILLA_GALLERY_BYTES = 100 * 1024;
const MIN_WEBP_QUALITY = 15;

type EncodeStep = { edge: number; quality: number };

const FAST_CLIENT_STEPS: EncodeStep[] = [
  { edge: 1280, quality: 50 },
  { edge: 1100, quality: 40 },
  { edge: 900, quality: 30 },
  { edge: 720, quality: 22 },
];

const HEAVY_STEPS: EncodeStep[] = [
  { edge: 1200, quality: 48 },
  { edge: 960, quality: 38 },
  { edge: 760, quality: 28 },
  { edge: 560, quality: 20 },
  { edge: 400, quality: MIN_WEBP_QUALITY },
];

async function encodeStep(buffer: Buffer, step: EncodeStep, maxBytes: number) {
  const encoded = await sharp(buffer, { failOn: "none", sequentialRead: true })
    .rotate()
    .resize({
      width: step.edge,
      height: step.edge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: step.quality,
      effort: 0,
      smartSubsample: true,
    })
    .toBuffer();

  return encoded.length <= maxBytes ? encoded : null;
}

/** Villa galeri görsellerini WebP'ye çevirir; hedef 100 KB altı. */
export async function processGalleryImageToWebp(
  buffer: Buffer,
  maxBytes = MAX_VILLA_GALLERY_BYTES
) {
  const steps =
    buffer.length <= 1_200_000 ? FAST_CLIENT_STEPS : HEAVY_STEPS;

  for (const step of steps) {
    const encoded = await encodeStep(buffer, step, maxBytes);
    if (encoded) return encoded;
  }

  const emergency = await sharp(buffer, { failOn: "none", sequentialRead: true })
    .rotate()
    .resize({ width: 280, height: 280, fit: "inside", withoutEnlargement: true })
    .webp({ quality: MIN_WEBP_QUALITY, effort: 0, smartSubsample: true })
    .toBuffer();

  if (emergency.length <= maxBytes) return emergency;

  throw new Error(
    `Görsel ${Math.ceil(emergency.length / 1024)} KB; ${Math.ceil(maxBytes / 1024)} KB altına indirilemedi`
  );
}
