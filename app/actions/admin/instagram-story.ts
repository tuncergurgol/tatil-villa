"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { generateInstagramStoryStills } from "@/lib/instagram-story/generate";
import { listInstagramStorySites } from "@/lib/instagram-story/sites";
import {
  getInstagramStoryVilla,
  searchInstagramStoryVillas,
} from "@/lib/queries/instagram-story";
import { PUBLIC_SITE_KEYS } from "@/lib/public-site-keys";

const generateSchema = z.object({
  villaId: z.string().min(1),
  imageUrls: z.array(z.string().min(1)).min(1).max(8),
  siteKey: z.enum(PUBLIC_SITE_KEYS).optional(),
  tagline: z.string().max(80).optional(),
  meta: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  ctaLabel: z.string().max(80).optional(),
  secondsPerSlide: z.coerce.number().min(2).max(8).optional(),
});

export async function listInstagramStorySitesAction() {
  await requireAdmin();
  return listInstagramStorySites();
}

export async function searchInstagramStoryVillasAction(query: string) {
  await requireAdmin();
  return searchInstagramStoryVillas(query, 12);
}

export async function getInstagramStoryVillaAction(villaId: string) {
  await requireAdmin();
  const villa = await getInstagramStoryVilla(villaId);
  if (!villa) return { error: "Villa bulunamadı" as const };
  return { villa };
}

export async function generateInstagramStoryStillsAction(
  raw: z.infer<typeof generateSchema>
) {
  await requireAdmin();
  const parsed = generateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz istek" };
  }

  try {
    const result = await generateInstagramStoryStills(parsed.data);
    return {
      villaName: result.villaName,
      slides: result.slides,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Story görselleri üretilemedi",
    };
  }
}
