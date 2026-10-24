"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { generateInstagramStoryStills } from "@/lib/instagram-story/generate";
import { INSTAGRAM_STORY_MODES } from "@/lib/instagram-story/types";
import { listInstagramStorySites } from "@/lib/instagram-story/sites";
import {
  getInstagramStoryCategory,
  getInstagramStoryRegion,
  getInstagramStoryVilla,
  searchInstagramStoryCategories,
  searchInstagramStoryRegions,
  searchInstagramStoryVillas,
} from "@/lib/queries/instagram-story";
import { PUBLIC_SITE_KEYS } from "@/lib/public-site-keys";

const generateSchema = z
  .object({
    mode: z.enum(INSTAGRAM_STORY_MODES).default("villa"),
    villaId: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
    regionId: z.string().min(1).optional(),
    imageUrls: z.array(z.string().min(1)).min(1).max(24),
    siteKey: z.enum(PUBLIC_SITE_KEYS).optional(),
    tagline: z.string().max(80).optional(),
    meta: z.string().max(120).optional(),
    location: z.string().max(120).optional(),
    ctaLabel: z.string().max(80).optional(),
    secondsPerSlide: z.coerce.number().min(2).max(8).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "villa" && !value.villaId) {
      ctx.addIssue({
        code: "custom",
        message: "Villa seçilmedi",
        path: ["villaId"],
      });
    }
    if (value.mode === "category" && !value.categoryId) {
      ctx.addIssue({
        code: "custom",
        message: "Kategori seçilmedi",
        path: ["categoryId"],
      });
    }
    if (value.mode === "region" && !value.regionId) {
      ctx.addIssue({
        code: "custom",
        message: "Bölge seçilmedi",
        path: ["regionId"],
      });
    }
    if (value.mode === "villa" && value.imageUrls.length > 8) {
      ctx.addIssue({
        code: "custom",
        message: "Villa modunda en fazla 8 görsel",
        path: ["imageUrls"],
      });
    }
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
  return { source: villa, villa };
}

export async function getInstagramStoryCategoryAction(categoryId: string) {
  await requireAdmin();
  const category = await getInstagramStoryCategory(categoryId);
  if (!category) return { error: "Kategori bulunamadı" as const };
  return { source: category };
}

export async function getInstagramStoryRegionAction(regionId: string) {
  await requireAdmin();
  const region = await getInstagramStoryRegion(regionId);
  if (!region) return { error: "Bölge bulunamadı" as const };
  return { source: region };
}

export async function searchInstagramStoryCategoriesAction(query: string) {
  await requireAdmin();
  return searchInstagramStoryCategories(query, 20);
}

export async function searchInstagramStoryRegionsAction(query: string) {
  await requireAdmin();
  return searchInstagramStoryRegions(query, 16);
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
      title: result.title,
      slides: result.slides,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Story görselleri üretilemedi",
    };
  }
}
