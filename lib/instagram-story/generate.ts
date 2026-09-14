import { composeInstagramStoryFrame } from "@/lib/instagram-story/compose";
import { resolveInstagramStorySite } from "@/lib/instagram-story/sites";
import { renderInstagramStoryVideo } from "@/lib/instagram-story/video";
import {
  readPublicAssetBuffer,
  getInstagramStoryVilla,
} from "@/lib/queries/instagram-story";
import type { InstagramStorySlideResult } from "@/lib/instagram-story/types";
import { slugifyTurkish } from "@/lib/tatildeyiz-next-data";

export type GenerateInstagramStoryInput = {
  villaId: string;
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
    throw new Error("Seçilen görsel bu villaya ait değil");
  }
}

export async function generateInstagramStoryStills(
  input: GenerateInstagramStoryInput
): Promise<{
  villaName: string;
  slides: InstagramStorySlideResult[];
  frames: Buffer[];
}> {
  const [villa, site] = await Promise.all([
    getInstagramStoryVilla(input.villaId),
    resolveInstagramStorySite(input.siteKey),
  ]);
  if (!villa) throw new Error("Villa bulunamadı");

  const imageUrls = input.imageUrls
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (imageUrls.length === 0) {
    throw new Error("En az bir villa görseli seçin");
  }

  const allowed = new Set(villa.images);
  for (const url of imageUrls) assertOwnedImage(url, allowed);

  const logoUrl = site.logoUrl || villa.logoUrl;
  const logoBuffer = logoUrl ? await readPublicAssetBuffer(logoUrl) : null;
  const accentColor = site.accentColor || villa.accentColor;
  const defaultCta = site.ctaLabel || villa.defaultCta;

  const frames: Buffer[] = [];
  const slides: InstagramStorySlideResult[] = [];
  const slug = slugifyTurkish(villa.name) || villa.slug || "villa";

  for (let i = 0; i < imageUrls.length; i += 1) {
    const photoBuffer = await readPublicAssetBuffer(imageUrls[i]!);
    if (!photoBuffer) {
      throw new Error(`Görsel okunamadı: ${imageUrls[i]}`);
    }

    const frame = await composeInstagramStoryFrame({
      photoBuffer,
      logoBuffer,
      name: villa.name,
      location: (input.location ?? villa.location).trim() || villa.location,
      meta: (input.meta ?? villa.defaultMeta).trim() || villa.defaultMeta,
      tagline:
        (input.tagline ?? villa.defaultTagline).trim() || villa.defaultTagline,
      ctaLabel: (input.ctaLabel ?? defaultCta).trim() || defaultCta,
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

  return { villaName: villa.name, slides, frames };
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
  const slug = slugifyTurkish(villaName) || "villa";
  return {
    villaName,
    buffer,
    fileName: `${slug}-instagram-story.mp4`,
  };
}
