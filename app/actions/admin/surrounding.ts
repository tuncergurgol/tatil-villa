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
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  isDefault: z.boolean().optional(),
  regionIds: z.array(z.string()).optional(),
});

function parseOptionalCoord(raw: string | undefined, label: string) {
  const value = (raw ?? "").trim();
  if (!value) return { ok: true as const, value: null as number | null };
  const num = Number(value.replace(",", "."));
  if (!Number.isFinite(num)) {
    return { ok: false as const, error: `${label} geçersiz` };
  }
  return { ok: true as const, value: num };
}

function parseLocationForm(formData: FormData) {
  const regionIds = formData
    .getAll("regionIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const parsed = locationSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    latitude: formData.get("latitude")?.toString() ?? "",
    longitude: formData.get("longitude")?.toString() ?? "",
    isDefault: formData.get("isDefault") === "on" || formData.get("isDefault") === "true",
    regionIds,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi",
    } as const;
  }

  const lat = parseOptionalCoord(parsed.data.latitude, "Enlem");
  if (!lat.ok) return { error: lat.error } as const;
  const lng = parseOptionalCoord(parsed.data.longitude, "Boylam");
  if (!lng.ok) return { error: lng.error } as const;

  if ((lat.value == null) !== (lng.value == null)) {
    return { error: "Enlem ve boylam birlikte girilmeli" } as const;
  }

  if (lat.value != null && lng.value != null) {
    if (lat.value < -90 || lat.value > 90) {
      return { error: "Enlem -90 ile 90 arasında olmalı" } as const;
    }
    if (lng.value < -180 || lng.value > 180) {
      return { error: "Boylam -180 ile 180 arasında olmalı" } as const;
    }
  }

  return {
    data: {
      name: parsed.data.name.trim(),
      categoryId: parsed.data.categoryId,
      latitude: lat.value,
      longitude: lng.value,
      isDefault: Boolean(parsed.data.isDefault),
      regionIds: parsed.data.regionIds ?? [],
    },
  } as const;
}

async function syncLocationRegionScopes(
  surroundingLocationId: string,
  regionIds: string[]
) {
  const uniqueIds = [...new Set(regionIds)];

  if (uniqueIds.length > 0) {
    const valid = await prisma.region.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    if (valid.length !== uniqueIds.length) {
      throw new Error("Geçersiz bölge seçimi");
    }
  }

  await prisma.$transaction([
    prisma.surroundingLocationRegion.deleteMany({
      where: { surroundingLocationId },
    }),
    ...(uniqueIds.length > 0
      ? [
          prisma.surroundingLocationRegion.createMany({
            data: uniqueIds.map((regionId) => ({
              surroundingLocationId,
              regionId,
            })),
          }),
        ]
      : []),
  ]);
}

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

  const parsed = parseLocationForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const maxOrder = await prisma.surroundingLocation.aggregate({
    where: { categoryId: parsed.data.categoryId },
    _max: { sortOrder: true },
  });

  try {
    const created = await prisma.surroundingLocation.create({
      data: {
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        isDefault: parsed.data.isDefault,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    await syncLocationRegionScopes(created.id, parsed.data.regionIds);
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

  const parsed = parseLocationForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  try {
    await prisma.surroundingLocation.update({
      where: { id },
      data: {
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        isDefault: parsed.data.isDefault,
      },
    });
    await syncLocationRegionScopes(id, parsed.data.regionIds);
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
