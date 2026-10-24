import {
  composeInstagramStoryCollage,
  composeInstagramStoryFrame,
} from "@/lib/instagram-story/compose";
import { resolveInstagramStorySite } from "@/lib/instagram-story/sites";
import { renderInstagramStoryVideo } from "@/lib/instagram-story/video";
import {
  getInstagramStoryCategory,
  getInstagramStoryRegion,
  getInstagramStoryVilla,
  readPublicAssetBuffer,
} from "@/lib/queries/instagram-story";
import type {
  InstagramStoryMode,
  InstagramStorySlideResult,
  InstagramStorySourcePayload,
} from "@/lib/instagram-story/types";
import { slugifyTurkish } from "@/lib/tatildeyiz-next-data";

export const COLLAGE_IMAGES_PER_SLIDE = 4;

export type GenerateInstagramStoryInput = {
  mode?: InstagramStoryMode;
  villaId?: string;
  categoryId?: string;
  regionId?: string;
  imageUrls: string[];
  siteKey?: string;
  tagline?: string;
  meta?: string;
  location?: string;
  ctaLabel?: string;
  secondsPerSlide?: number;
  musicBuffer?: Buffer | null;
  musicExt?: string;
  musicVolume?: number;
};

function assertOwnedImage(url: string, allowed: Set<string>) {
  if (!allowed.has(url)) {
    throw new Error("Seçilen görsel bu kaynağa ait değil");
  }
}

function chunkUrls(urls: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < urls.length; i += size) {
    chunks.push(urls.slice(i, i + size));
  }
  return chunks;
}

async function resolveSource(
  input: GenerateInstagramStoryInput
): Promise<InstagramStorySourcePayload> {
  const mode = input.mode ?? "villa";

  if (mode === "villa") {
    if (!input.villaId) throw new Error("Villa seçilmedi");
    const villa = await getInstagramStoryVilla(input.villaId);
    if (!villa) throw new Error("Villa bulunamadı");
    return villa;
  }

  if (mode === "category") {
    if (!input.categoryId) throw new Error("Kategori seçilmedi");
    const category = await getInstagramStoryCategory(input.categoryId);
    if (!category) throw new Error("Kategori bulunamadı");
    if (category.images.length === 0) {
      throw new Error("Bu kategoride görseli olan aktif tesis yok");
    }
    return category;
  }

  if (!input.regionId) throw new Error("Bölge seçilmedi");
  const region = await getInstagramStoryRegion(input.regionId);
  if (!region) throw new Error("Bölge bulunamadı");
  if (region.images.length === 0) {
    throw new Error("Bu bölgede görseli olan aktif tesis yok");
  }
  return region;
}

export async function generateInstagramStoryStills(
  input: GenerateInstagramStoryInput
): Promise<{
  title: string;
  villaName: string;
  slides: InstagramStorySlideResult[];
  frames: Buffer[];
}> {
  const [source, site] = await Promise.all([
    resolveSource(input),
    resolveInstagramStorySite(input.siteKey),
  ]);

  const imageUrls = input.imageUrls
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, source.mode === "villa" ? 8 : 24);
  if (imageUrls.length === 0) {
    throw new Error("En az bir görsel seçin");
  }

  const allowed = new Set(source.images);
  for (const url of imageUrls) assertOwnedImage(url, allowed);

  const logoUrl = site.logoUrl || source.logoUrl;
  const logoBuffer = logoUrl ? await readPublicAssetBuffer(logoUrl) : null;
  const accentColor = site.accentColor || source.accentColor;
  const defaultCta = site.ctaLabel || source.defaultCta;
  const name = source.name;
  const location =
    (input.location ?? source.location).trim() || source.location;
  const meta = (input.meta ?? source.defaultMeta).trim() || source.defaultMeta;
  const tagline =
    (input.tagline ?? source.defaultTagline).trim() || source.defaultTagline;
  const ctaLabel = (input.ctaLabel ?? defaultCta).trim() || defaultCta;
  const slug = slugifyTurkish(name) || source.slug || "story";

  const frames: Buffer[] = [];
  const slides: InstagramStorySlideResult[] = [];

  if (source.mode === "villa") {
    for (let i = 0; i < imageUrls.length; i += 1) {
      const photoBuffer = await readPublicAssetBuffer(imageUrls[i]!);
      if (!photoBuffer) {
        throw new Error(`Görsel okunamadı: ${imageUrls[i]}`);
      }

      const frame = await composeInstagramStoryFrame({
        photoBuffer,
        logoBuffer,
        name,
        location,
        meta,
        tagline,
        ctaLabel,
        accentColor,
      });

      frames.push(frame);
      slides.push({
        index: i,
        fileName: `${slug}-story-${String(i + 1).padStart(2, "0")}.jpg`,
        mimeType: "image/jpeg",
        base64: frame.toString("base64"),
        byteLength: frame.length,
      });
    }
  } else {
    const groups = chunkUrls(imageUrls, COLLAGE_IMAGES_PER_SLIDE);
    for (let i = 0; i < groups.length; i += 1) {
      const group = groups[i]!;
      const photoBuffers: Buffer[] = [];
      for (const url of group) {
        const photoBuffer = await readPublicAssetBuffer(url);
        if (!photoBuffer) {
          throw new Error(`Görsel okunamadı: ${url}`);
        }
        photoBuffers.push(photoBuffer);
      }

      const frame = await composeInstagramStoryCollage({
        photoBuffers,
        logoBuffer,
        name,
        location,
        meta,
        tagline,
        ctaLabel,
        accentColor,
      });

      frames.push(frame);
      slides.push({
        index: i,
        fileName: `${slug}-kolaj-${String(i + 1).padStart(2, "0")}.jpg`,
        mimeType: "image/jpeg",
        base64: frame.toString("base64"),
        byteLength: frame.length,
      });
    }
  }

  return { title: name, villaName: name, slides, frames };
}

export async function generateInstagramStoryVideoBuffer(
  input: GenerateInstagramStoryInput
): Promise<{ fileName: string; buffer: Buffer; villaName: string }> {
  const { villaName, frames } = await generateInstagramStoryStills(input);
  const buffer = await renderInstagramStoryVideo(frames, {
    secondsPerSlide: input.secondsPerSlide,
    musicBuffer: input.musicBuffer,
    musicExt: input.musicExt,
    musicVolume: input.musicVolume,
  });
  const slug = slugifyTurkish(villaName) || "story";
  const suffix =
    (input.mode ?? "villa") === "villa" ? "instagram-story" : "instagram-kolaj";
  return {
    villaName,
    buffer,
    fileName: `${slug}-${suffix}.mp4`,
  };
}
