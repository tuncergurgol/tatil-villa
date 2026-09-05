"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { toSurroundingSlug } from "@/lib/surrounding-utils";
import { VillaPeriodCurrency } from "@prisma/client";

export type TourActionState = {
  success?: boolean;
  error?: string;
};

function revalidateTourPaths(slug?: string) {
  revalidatePath("/admin/tur");
  revalidatePath("/admin/tur-aktiviteler");
  revalidatePath("/turlar");
  revalidatePath("/tur");
  revalidatePath("/tur/liste");
  if (slug) revalidatePath(`/tur/${slug}`);
}

async function uniqueTourSlug(name: string, excludeId?: string) {
  const base = toSurroundingSlug(name) || "tur";
  let slug = base;
  let i = 2;
  while (true) {
    const existing = await prisma.tour.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i}`;
    i += 1;
  }
}

const tourSchema = z.object({
  title: z.string().min(1, "Başlık gerekli"),
  slug: z.string().optional().default(""),
  shortDesc: z.string().optional().default(""),
  overview: z.string().optional().default(""),
  descriptionHtml: z.string().optional().default(""),
  location: z.string().optional().default(""),
  durationHours: z.string().optional().default(""),
  groupSize: z.string().optional().default(""),
  tag: z.string().optional().default(""),
  priceFrom: z.coerce.number().min(0).optional().nullable(),
  currency: z.enum(["TL", "EUR", "USD", "GBP"]).default("TL"),
  hasTransfer: z.enum(["true", "false"]).transform((v) => v === "true"),
  freeCancelationHours: z.string().optional().default(""),
  coverImage: z.string().optional().default(""),
  seoTitle: z.string().optional().default(""),
  seoDescription: z.string().optional().default(""),
  seoKeywords: z.string().optional().default(""),
  canonicalPath: z.string().optional().default(""),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
  onList: z.enum(["true", "false"]).transform((v) => v === "true"),
  includesText: z.string().optional().default(""),
  highlightsText: z.string().optional().default(""),
  excludesText: z.string().optional().default(""),
});

function parseLines(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTourForm(formData: FormData) {
  const priceRaw = String(formData.get("priceFrom") ?? "").trim();
  return tourSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") ?? "",
    shortDesc: formData.get("shortDesc") ?? "",
    overview: formData.get("overview") ?? "",
    descriptionHtml: formData.get("descriptionHtml") ?? "",
    location: formData.get("location") ?? "",
    durationHours: formData.get("durationHours") ?? "",
    groupSize: formData.get("groupSize") ?? "",
    tag: formData.get("tag") ?? "",
    priceFrom: priceRaw === "" ? null : priceRaw,
    currency: formData.get("currency") ?? "TL",
    hasTransfer: formData.get("hasTransfer") ?? "false",
    freeCancelationHours: formData.get("freeCancelationHours") ?? "",
    coverImage: formData.get("coverImage") ?? "",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
    seoKeywords: formData.get("seoKeywords") ?? "",
    canonicalPath: formData.get("canonicalPath") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") ?? "true",
    onList: formData.get("onList") ?? "true",
    includesText: formData.get("includesText") ?? "",
    highlightsText: formData.get("highlightsText") ?? "",
    excludesText: formData.get("excludesText") ?? "",
  });
}

function toTourWriteData(
  parsed: z.infer<typeof tourSchema>,
  slug: string
) {
  const seoTitle =
    parsed.seoTitle.trim() || `${parsed.title} | Tatildeyiz`;
  const seoDescription =
    parsed.seoDescription.trim() ||
    parsed.shortDesc.trim() ||
    `${parsed.title} — Tatildeyiz günübirlik tur ve aktiviteler.`;
  const canonicalPath =
    parsed.canonicalPath.trim() || `/tur/${slug}`;

  return {
    slug,
    title: parsed.title.trim(),
    shortDesc: parsed.shortDesc,
    overview: parsed.overview,
    descriptionHtml: parsed.descriptionHtml,
    location: parsed.location,
    durationHours: parsed.durationHours,
    groupSize: parsed.groupSize,
    tag: parsed.tag,
    priceFrom: parsed.priceFrom,
    currency: parsed.currency as VillaPeriodCurrency,
    hasTransfer: parsed.hasTransfer,
    freeCancelationHours: parsed.freeCancelationHours,
    coverImage: parsed.coverImage,
    seoTitle,
    seoDescription,
    seoKeywords: parsed.seoKeywords,
    canonicalPath,
    sortOrder: parsed.sortOrder,
    isActive: parsed.isActive,
    onList: parsed.onList,
    includesJson: JSON.stringify(parseLines(parsed.includesText)),
    highlightsJson: JSON.stringify(parseLines(parsed.highlightsText)),
    excludesJson: JSON.stringify(parseLines(parsed.excludesText)),
  };
}

export async function createTour(
  _prev: TourActionState,
  formData: FormData
): Promise<TourActionState> {
  await requireAdmin();
  const parsed = parseTourForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }
  try {
    const slug =
      (parsed.data.slug && toSurroundingSlug(parsed.data.slug)) ||
      (await uniqueTourSlug(parsed.data.title));
    const finalSlug = await uniqueTourSlug(slug);
    await prisma.tour.create({
      data: toTourWriteData(parsed.data, finalSlug),
    });
    revalidateTourPaths(finalSlug);
    return { success: true };
  } catch {
    return { error: "Tur oluşturulamadı" };
  }
}

export async function updateTour(
  _prev: TourActionState,
  formData: FormData
): Promise<TourActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Kayıt bulunamadı" };
  const parsed = parseTourForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }
  try {
    const slug =
      (parsed.data.slug && toSurroundingSlug(parsed.data.slug)) ||
      (await uniqueTourSlug(parsed.data.title, id));
    const finalSlug = await uniqueTourSlug(slug, id);
    await prisma.tour.update({
      where: { id },
      data: toTourWriteData(parsed.data, finalSlug),
    });
    revalidateTourPaths(finalSlug);
    return { success: true };
  } catch {
    return { error: "Tur güncellenemedi" };
  }
}

export async function deleteTour(id: string): Promise<TourActionState> {
  await requireAdmin();
  try {
    await prisma.tour.delete({ where: { id } });
    revalidateTourPaths();
    return { success: true };
  } catch {
    return { error: "Tur silinemedi" };
  }
}

export async function toggleTourActive(id: string): Promise<TourActionState> {
  await requireAdmin();
  try {
    const item = await prisma.tour.findUnique({ where: { id } });
    if (!item) return { error: "Kayıt bulunamadı" };
    await prisma.tour.update({
      where: { id },
      data: { isActive: !item.isActive },
    });
    revalidateTourPaths(item.slug);
    return { success: true };
  } catch {
    return { error: "Durum değiştirilemedi" };
  }
}
