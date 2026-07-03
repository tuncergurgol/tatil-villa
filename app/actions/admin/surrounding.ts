"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { toSurroundingSlug } from "@/lib/surrounding-utils";

export type SurroundingActionState = {
  success?: boolean;
  error?: string;
};

const categorySchema = z.object({
  name: z.string().min(1, "Kategori adı gerekli"),
});

const locationSchema = z.object({
  name: z.string().min(1, "Konum adı gerekli"),
  categoryId: z.string().min(1, "Kategori seçin"),
});

function revalidateSurroundingPaths() {
  revalidatePath("/admin/tanimlamalar/cevre-konum");
}

async function uniqueCategorySlug(name: string, excludeId?: string) {
  const base = toSurroundingSlug(name) || "kategori";
  let slug = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.surroundingCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

export async function createSurroundingCategory(
  _prev: SurroundingActionState,
  formData: FormData
): Promise<SurroundingActionState> {
  await requireAdmin();

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const maxOrder = await prisma.surroundingCategory.aggregate({
    _max: { sortOrder: true },
  });

  try {
    await prisma.surroundingCategory.create({
      data: {
        name: parsed.data.name.trim(),
        slug: await uniqueCategorySlug(parsed.data.name),
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    revalidateSurroundingPaths();
    return { success: true };
  } catch {
    return { error: "Kategori oluşturulamadı" };
  }
}

export async function updateSurroundingCategory(
  _prev: SurroundingActionState,
  formData: FormData
): Promise<SurroundingActionState> {
  await requireAdmin();

  const id = formData.get("id") as string;
  if (!id) return { error: "Kayıt bulunamadı" };

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    await prisma.surroundingCategory.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        slug: await uniqueCategorySlug(parsed.data.name, id),
      },
    });
    revalidateSurroundingPaths();
    return { success: true };
  } catch {
    return { error: "Kategori güncellenemedi" };
  }
}

export async function deleteSurroundingCategory(
  id: string
): Promise<SurroundingActionState> {
  await requireAdmin();

  const category = await prisma.surroundingCategory.findUnique({
    where: { id },
    include: { _count: { select: { locations: true } } },
  });

  if (!category) return { error: "Kategori bulunamadı" };
  if (category._count.locations > 0) {
    return {
      error: "Bu kategoriye bağlı konumlar var. Önce konumları silin veya taşıyın.",
    };
  }

  try {
    await prisma.surroundingCategory.delete({ where: { id } });
    revalidateSurroundingPaths();
    return { success: true };
  } catch {
    return { error: "Kategori silinemedi" };
  }
}

export async function moveSurroundingCategory(
  id: string,
  direction: "up" | "down"
): Promise<SurroundingActionState> {
  await requireAdmin();

  const categories = await prisma.surroundingCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, sortOrder: true },
  });

  const index = categories.findIndex((item) => item.id === id);
  if (index === -1) return { error: "Kategori bulunamadı" };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= categories.length) {
    return { success: true };
  }

  const current = categories[index];
  const target = categories[swapIndex];

  try {
    await prisma.$transaction([
      prisma.surroundingCategory.update({
        where: { id: current.id },
        data: { sortOrder: target.sortOrder },
      }),
      prisma.surroundingCategory.update({
        where: { id: target.id },
        data: { sortOrder: current.sortOrder },
      }),
    ]);
    revalidateSurroundingPaths();
    return { success: true };
  } catch {
    return { error: "Sıralama güncellenemedi" };
  }
}

export async function createSurroundingLocation(
  _prev: SurroundingActionState,
  formData: FormData
): Promise<SurroundingActionState> {
  await requireAdmin();

  const parsed = locationSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const maxOrder = await prisma.surroundingLocation.aggregate({
    where: { categoryId: parsed.data.categoryId },
    _max: { sortOrder: true },
  });

  try {
    await prisma.surroundingLocation.create({
      data: {
        name: parsed.data.name.trim(),
        categoryId: parsed.data.categoryId,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    revalidateSurroundingPaths();
    return { success: true };
  } catch {
    return { error: "Konum tipi oluşturulamadı" };
  }
}

export async function updateSurroundingLocation(
  _prev: SurroundingActionState,
  formData: FormData
): Promise<SurroundingActionState> {
  await requireAdmin();

  const id = formData.get("id") as string;
  if (!id) return { error: "Kayıt bulunamadı" };

  const parsed = locationSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    await prisma.surroundingLocation.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        categoryId: parsed.data.categoryId,
      },
    });
    revalidateSurroundingPaths();
    return { success: true };
  } catch {
    return { error: "Konum tipi güncellenemedi" };
  }
}

export async function deleteSurroundingLocation(
  id: string
): Promise<SurroundingActionState> {
  await requireAdmin();

  try {
    await prisma.surroundingLocation.delete({ where: { id } });
    revalidateSurroundingPaths();
    return { success: true };
  } catch {
    return { error: "Konum tipi silinemedi" };
  }
}

export async function moveSurroundingLocation(
  id: string,
  direction: "up" | "down"
): Promise<SurroundingActionState> {
  await requireAdmin();

  const location = await prisma.surroundingLocation.findUnique({
    where: { id },
    select: { id: true, categoryId: true, sortOrder: true },
  });
  if (!location) return { error: "Konum bulunamadı" };

  const siblings = await prisma.surroundingLocation.findMany({
    where: { categoryId: location.categoryId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, sortOrder: true },
  });

  const index = siblings.findIndex((item) => item.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) {
    return { success: true };
  }

  const current = siblings[index];
  const target = siblings[swapIndex];

  try {
    await prisma.$transaction([
      prisma.surroundingLocation.update({
        where: { id: current.id },
        data: { sortOrder: target.sortOrder },
      }),
      prisma.surroundingLocation.update({
        where: { id: target.id },
        data: { sortOrder: current.sortOrder },
      }),
    ]);
    revalidateSurroundingPaths();
    return { success: true };
  } catch {
    return { error: "Sıralama güncellenemedi" };
  }
}
