"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  syncAlphabeticalAmenitySortOrders,
  syncAlphabeticalCategorySortOrders,
} from "@/lib/amenity-sort";
import { requireAdmin } from "@/lib/auth-helpers";
import { toSurroundingSlug } from "@/lib/surrounding-utils";

export type AmenityActionState = {
  success?: boolean;
  error?: string;
};

const categorySchema = z.object({
  name: z.string().min(1, "Kategori adı gerekli"),
});

const amenitySchema = z.object({
  name: z.string().min(1, "Olanak adı gerekli"),
  categoryId: z.string().min(1, "Kategori seçin"),
  facilityCategoryId: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  isDefault: z.enum(["true", "false"]).transform((v) => v === "true"),
  showInSearch: z.enum(["true", "false"]).transform((v) => v === "true"),
});

function revalidateAmenityPaths() {
  revalidatePath("/admin/tanimlamalar/villa-olanaklari");
  revalidatePath("/admin/villalar/yeni");
  revalidatePath("/admin/villalar");
  revalidatePath("/villalar");
}

async function uniqueCategorySlug(name: string, excludeId?: string) {
  const base = toSurroundingSlug(name) || "kategori";
  let slug = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.amenityCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

export async function createAmenityCategory(
  _prev: AmenityActionState,
  formData: FormData
): Promise<AmenityActionState> {
  await requireAdmin();

  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    await prisma.amenityCategory.create({
      data: {
        name: parsed.data.name.trim(),
        slug: await uniqueCategorySlug(parsed.data.name),
        sortOrder: 0,
      },
    });
    await syncAlphabeticalCategorySortOrders();
    revalidateAmenityPaths();
    return { success: true };
  } catch {
    return { error: "Kategori oluşturulamadı" };
  }
}

export async function updateAmenityCategory(
  _prev: AmenityActionState,
  formData: FormData
): Promise<AmenityActionState> {
  await requireAdmin();

  const id = formData.get("id") as string;
  if (!id) return { error: "Kayıt bulunamadı" };

  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    await prisma.amenityCategory.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        slug: await uniqueCategorySlug(parsed.data.name, id),
      },
    });
    await syncAlphabeticalCategorySortOrders();
    revalidateAmenityPaths();
    return { success: true };
  } catch {
    return { error: "Kategori güncellenemedi" };
  }
}

export async function deleteAmenityCategory(
  id: string
): Promise<AmenityActionState> {
  await requireAdmin();

  const category = await prisma.amenityCategory.findUnique({
    where: { id },
    include: { _count: { select: { amenities: true } } },
  });

  if (!category) return { error: "Kategori bulunamadı" };
  if (category._count.amenities > 0) {
    return {
      error: "Bu kategoriye bağlı olanaklar var. Önce olanakları silin veya taşıyın.",
    };
  }

  try {
    await prisma.amenityCategory.delete({ where: { id } });
    await syncAlphabeticalCategorySortOrders();
    revalidateAmenityPaths();
    return { success: true };
  } catch {
    return { error: "Kategori silinemedi" };
  }
}

export async function createAmenity(
  _prev: AmenityActionState,
  formData: FormData
): Promise<AmenityActionState> {
  await requireAdmin();

  const parsed = amenitySchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    facilityCategoryId: formData.get("facilityCategoryId") ?? undefined,
    isDefault: formData.get("isDefault") ?? "false",
    showInSearch: formData.get("showInSearch") ?? "false",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    await prisma.amenity.create({
      data: {
        name: parsed.data.name.trim(),
        categoryId: parsed.data.categoryId,
        facilityCategoryId: parsed.data.facilityCategoryId,
        isDefault: parsed.data.isDefault,
        showInSearch: parsed.data.showInSearch,
        sortOrder: 0,
      },
    });
    await syncAlphabeticalAmenitySortOrders(parsed.data.categoryId);
    revalidateAmenityPaths();
    return { success: true };
  } catch {
    return { error: "Olanak oluşturulamadı" };
  }
}

export async function updateAmenity(
  _prev: AmenityActionState,
  formData: FormData
): Promise<AmenityActionState> {
  await requireAdmin();

  const id = formData.get("id") as string;
  if (!id) return { error: "Kayıt bulunamadı" };

  const parsed = amenitySchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    facilityCategoryId: formData.get("facilityCategoryId") ?? undefined,
    isDefault: formData.get("isDefault") ?? "false",
    showInSearch: formData.get("showInSearch") ?? "false",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const existing = await prisma.amenity.findUnique({
    where: { id },
    select: { categoryId: true },
  });
  if (!existing) return { error: "Kayıt bulunamadı" };

  try {
    await prisma.amenity.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        categoryId: parsed.data.categoryId,
        facilityCategoryId: parsed.data.facilityCategoryId,
        isDefault: parsed.data.isDefault,
        showInSearch: parsed.data.showInSearch,
      },
    });
    await syncAlphabeticalAmenitySortOrders(parsed.data.categoryId);
    if (existing.categoryId !== parsed.data.categoryId) {
      await syncAlphabeticalAmenitySortOrders(existing.categoryId);
    }
    revalidateAmenityPaths();
    return { success: true };
  } catch {
    return { error: "Olanak güncellenemedi" };
  }
}

export async function deleteAmenity(id: string): Promise<AmenityActionState> {
  await requireAdmin();

  const existing = await prisma.amenity.findUnique({
    where: { id },
    select: { categoryId: true },
  });
  if (!existing) return { error: "Olanak bulunamadı" };

  try {
    await prisma.amenity.delete({ where: { id } });
    await syncAlphabeticalAmenitySortOrders(existing.categoryId);
    revalidateAmenityPaths();
    return { success: true };
  } catch {
    return { error: "Olanak silinemedi" };
  }
}

export async function toggleAmenityDefault(
  id: string
): Promise<AmenityActionState> {
  await requireAdmin();

  const amenity = await prisma.amenity.findUnique({
    where: { id },
    select: { isDefault: true },
  });
  if (!amenity) return { error: "Olanak bulunamadı" };

  try {
    await prisma.amenity.update({
      where: { id },
      data: { isDefault: !amenity.isDefault },
    });
    revalidateAmenityPaths();
    return { success: true };
  } catch {
    return { error: "Varsayılan durumu güncellenemedi" };
  }
}

export async function toggleAmenityShowInSearch(
  id: string
): Promise<AmenityActionState> {
  await requireAdmin();

  const amenity = await prisma.amenity.findUnique({
    where: { id },
    select: { showInSearch: true },
  });
  if (!amenity) return { error: "Olanak bulunamadı" };

  try {
    await prisma.amenity.update({
      where: { id },
      data: { showInSearch: !amenity.showInSearch },
    });
    revalidateAmenityPaths();
    return { success: true };
  } catch {
    return { error: "Arama listesi durumu güncellenemedi" };
  }
}
