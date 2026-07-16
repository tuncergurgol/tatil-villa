"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { toSurroundingSlug } from "@/lib/surrounding-utils";
import { VillaPeriodCurrency } from "@prisma/client";
import { CAR_RENTAL_PAGE_SETTINGS_SEED } from "@/prisma/car-rental-seed-data";

export type CarRentalActionState = {
  success?: boolean;
  error?: string;
};

function revalidateCarRentalPaths() {
  revalidatePath("/admin/arac-kiralama");
  revalidatePath("/admin/arac-kiralama/arama-cubugu");
  revalidatePath("/admin/arac-kiralama/kategoriler");
  revalidatePath("/admin/arac-kiralama/noktalar");
  revalidatePath("/admin/arac-kiralama/surucu-kriterleri");
  revalidatePath("/arac-kiralama");
}

const settingsSchema = z.object({
  heroBadge: z.string().min(1),
  heroTitle: z.string().min(1),
  heroSubtitle: z.string().min(1),
  sameLocationDefault: z.enum(["true", "false"]).transform((v) => v === "true"),
  showSameLocationToggle: z
    .enum(["true", "false"])
    .transform((v) => v === "true"),
  sameLocationLabel: z.string().min(1),
  pickupLabel: z.string().min(1),
  returnLabel: z.string().min(1),
  pickupDateLabel: z.string().min(1),
  returnDateLabel: z.string().min(1),
  driverAgeLabel: z.string().min(1),
  driverAgeOptionsText: z.string().min(1),
  defaultDriverAge: z.string().min(1),
  ctaText: z.string().min(1),
  rentalDaysHint: z.string().optional().default(""),
  categoriesTitle: z.string().min(1),
  categoriesSubtitle: z.string().optional().default(""),
  locationsTitle: z.string().min(1),
  locationsSubtitle: z.string().optional().default(""),
  criteriaTitle: z.string().min(1),
  criteriaSubtitle: z.string().optional().default(""),
});

export async function saveCarRentalPageSettings(
  _prev: CarRentalActionState,
  formData: FormData
): Promise<CarRentalActionState> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({
    heroBadge: formData.get("heroBadge"),
    heroTitle: formData.get("heroTitle"),
    heroSubtitle: formData.get("heroSubtitle"),
    sameLocationDefault: formData.get("sameLocationDefault") ?? "true",
    showSameLocationToggle: formData.get("showSameLocationToggle") ?? "true",
    sameLocationLabel: formData.get("sameLocationLabel"),
    pickupLabel: formData.get("pickupLabel"),
    returnLabel: formData.get("returnLabel"),
    pickupDateLabel: formData.get("pickupDateLabel"),
    returnDateLabel: formData.get("returnDateLabel"),
    driverAgeLabel: formData.get("driverAgeLabel"),
    driverAgeOptionsText: formData.get("driverAgeOptionsText"),
    defaultDriverAge: formData.get("defaultDriverAge"),
    ctaText: formData.get("ctaText"),
    rentalDaysHint: formData.get("rentalDaysHint") ?? "",
    categoriesTitle: formData.get("categoriesTitle"),
    categoriesSubtitle: formData.get("categoriesSubtitle") ?? "",
    locationsTitle: formData.get("locationsTitle"),
    locationsSubtitle: formData.get("locationsSubtitle") ?? "",
    criteriaTitle: formData.get("criteriaTitle"),
    criteriaSubtitle: formData.get("criteriaSubtitle") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  const options = parsed.data.driverAgeOptionsText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (options.length === 0) {
    return { error: "En az bir sürücü yaşı seçeneği girin" };
  }

  const { driverAgeOptionsText: _, ...rest } = parsed.data;

  try {
    const { id: _seedId, ...seedRest } = CAR_RENTAL_PAGE_SETTINGS_SEED;
    await prisma.carRentalPageSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...seedRest,
        ...rest,
        driverAgeOptionsJson: JSON.stringify(options),
      },
      update: {
        ...rest,
        driverAgeOptionsJson: JSON.stringify(options),
      },
    });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Ayarlar kaydedilemedi" };
  }
}

const categorySchema = z.object({
  name: z.string().min(1, "Ad gerekli"),
  slug: z.string().optional().default(""),
  description: z.string().optional().default(""),
  priceFrom: z.coerce.number().min(0),
  currency: z.enum(["TL", "EUR", "USD", "GBP"]),
  image: z.string().optional().default(""),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
});

async function uniqueCategorySlug(name: string, excludeId?: string) {
  const base = toSurroundingSlug(name) || "kategori";
  let slug = base;
  let n = 2;
  while (true) {
    const existing = await prisma.carRentalCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

function parseCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    priceFrom: formData.get("priceFrom") ?? 0,
    currency: formData.get("currency") ?? "TL",
    image: formData.get("image") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") ?? "true",
  });
}

export async function createCarRentalCategory(
  _prev: CarRentalActionState,
  formData: FormData
): Promise<CarRentalActionState> {
  await requireAdmin();
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }
  try {
    const slug =
      (parsed.data.slug && toSurroundingSlug(parsed.data.slug)) ||
      (await uniqueCategorySlug(parsed.data.name));
    await prisma.carRentalCategory.create({
      data: {
        ...parsed.data,
        slug: await uniqueCategorySlug(slug),
        currency: parsed.data.currency as VillaPeriodCurrency,
      },
    });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Kategori oluşturulamadı" };
  }
}

export async function updateCarRentalCategory(
  _prev: CarRentalActionState,
  formData: FormData
): Promise<CarRentalActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Kayıt bulunamadı" };
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }
  try {
    const slug =
      (parsed.data.slug && toSurroundingSlug(parsed.data.slug)) ||
      (await uniqueCategorySlug(parsed.data.name, id));
    await prisma.carRentalCategory.update({
      where: { id },
      data: {
        ...parsed.data,
        slug: await uniqueCategorySlug(slug, id),
        currency: parsed.data.currency as VillaPeriodCurrency,
      },
    });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Kategori güncellenemedi" };
  }
}

export async function deleteCarRentalCategory(
  id: string
): Promise<CarRentalActionState> {
  await requireAdmin();
  try {
    await prisma.carRentalCategory.delete({ where: { id } });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Kategori silinemedi" };
  }
}

export async function toggleCarRentalCategoryActive(
  id: string
): Promise<CarRentalActionState> {
  await requireAdmin();
  try {
    const item = await prisma.carRentalCategory.findUnique({ where: { id } });
    if (!item) return { error: "Kayıt bulunamadı" };
    await prisma.carRentalCategory.update({
      where: { id },
      data: { isActive: !item.isActive },
    });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Durum değiştirilemedi" };
  }
}

const locationSchema = z.object({
  name: z.string().min(1, "Ad gerekli"),
  city: z.string().optional().default(""),
  iataCode: z.string().optional().default(""),
  vehicleCountHint: z.string().optional().default(""),
  isAirport: z.enum(["true", "false"]).transform((v) => v === "true"),
  isPopular: z.enum(["true", "false"]).transform((v) => v === "true"),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
});

function parseLocationForm(formData: FormData) {
  return locationSchema.safeParse({
    name: formData.get("name"),
    city: formData.get("city") ?? "",
    iataCode: formData.get("iataCode") ?? "",
    vehicleCountHint: formData.get("vehicleCountHint") ?? "",
    isAirport: formData.get("isAirport") ?? "true",
    isPopular: formData.get("isPopular") ?? "false",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") ?? "true",
  });
}

export async function createCarRentalLocation(
  _prev: CarRentalActionState,
  formData: FormData
): Promise<CarRentalActionState> {
  await requireAdmin();
  const parsed = parseLocationForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }
  try {
    await prisma.carRentalLocation.create({
      data: {
        ...parsed.data,
        iataCode: parsed.data.iataCode.trim().toUpperCase(),
      },
    });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Nokta oluşturulamadı" };
  }
}

export async function updateCarRentalLocation(
  _prev: CarRentalActionState,
  formData: FormData
): Promise<CarRentalActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Kayıt bulunamadı" };
  const parsed = parseLocationForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }
  try {
    await prisma.carRentalLocation.update({
      where: { id },
      data: {
        ...parsed.data,
        iataCode: parsed.data.iataCode.trim().toUpperCase(),
      },
    });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Nokta güncellenemedi" };
  }
}

export async function deleteCarRentalLocation(
  id: string
): Promise<CarRentalActionState> {
  await requireAdmin();
  try {
    await prisma.carRentalLocation.delete({ where: { id } });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Nokta silinemedi" };
  }
}

export async function toggleCarRentalLocationActive(
  id: string
): Promise<CarRentalActionState> {
  await requireAdmin();
  try {
    const item = await prisma.carRentalLocation.findUnique({ where: { id } });
    if (!item) return { error: "Kayıt bulunamadı" };
    await prisma.carRentalLocation.update({
      where: { id },
      data: { isActive: !item.isActive },
    });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Durum değiştirilemedi" };
  }
}

const criterionSchema = z.object({
  title: z.string().min(1, "Başlık gerekli"),
  description: z.string().optional().default(""),
  icon: z.string().optional().default(""),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
});

function parseCriterionForm(formData: FormData) {
  return criterionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    icon: formData.get("icon") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isActive: formData.get("isActive") ?? "true",
  });
}

export async function createCarRentalCriterion(
  _prev: CarRentalActionState,
  formData: FormData
): Promise<CarRentalActionState> {
  await requireAdmin();
  const parsed = parseCriterionForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }
  try {
    await prisma.carRentalDriverCriterion.create({ data: parsed.data });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Kriter oluşturulamadı" };
  }
}

export async function updateCarRentalCriterion(
  _prev: CarRentalActionState,
  formData: FormData
): Promise<CarRentalActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Kayıt bulunamadı" };
  const parsed = parseCriterionForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }
  try {
    await prisma.carRentalDriverCriterion.update({
      where: { id },
      data: parsed.data,
    });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Kriter güncellenemedi" };
  }
}

export async function deleteCarRentalCriterion(
  id: string
): Promise<CarRentalActionState> {
  await requireAdmin();
  try {
    await prisma.carRentalDriverCriterion.delete({ where: { id } });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Kriter silinemedi" };
  }
}

export async function toggleCarRentalCriterionActive(
  id: string
): Promise<CarRentalActionState> {
  await requireAdmin();
  try {
    const item = await prisma.carRentalDriverCriterion.findUnique({
      where: { id },
    });
    if (!item) return { error: "Kayıt bulunamadı" };
    await prisma.carRentalDriverCriterion.update({
      where: { id },
      data: { isActive: !item.isActive },
    });
    revalidateCarRentalPaths();
    return { success: true };
  } catch {
    return { error: "Durum değiştirilemedi" };
  }
}
