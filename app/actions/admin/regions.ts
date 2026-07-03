"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export type RegionActionState = {
  success?: boolean;
  error?: string;
};

const regionSchema = z.object({
  name: z.string().min(1, "Bölge adı gerekli"),
  slug: z
    .string()
    .min(1, "Slug gerekli")
    .regex(/^[a-z0-9-]+$/, "Slug yalnızca küçük harf, rakam ve tire içerebilir"),
  image: z.string().min(1, "Görsel gerekli"),
  description: z.string(),
  longDescription: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  seoKeywords: z.string(),
  parentId: z.string().optional(),
  active: z.boolean(),
  published: z.boolean(),
  showInSearch: z.boolean(),
  showInOffer: z.boolean(),
  showOnHome: z.boolean(),
  sortOrder: z.coerce.number().int().default(0),
});

function checkboxValue(formData: FormData, name: string) {
  return formData.get(name) === "true";
}

function parseRegionForm(formData: FormData) {
  const parentId = (formData.get("parentId") as string | null)?.trim();
  return regionSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    image: formData.get("image"),
    description: formData.get("description"),
    longDescription: formData.get("longDescription"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
    seoKeywords: formData.get("seoKeywords"),
    parentId: parentId || undefined,
    active: checkboxValue(formData, "active"),
    published: checkboxValue(formData, "published"),
    showInSearch: checkboxValue(formData, "showInSearch"),
    showInOffer: checkboxValue(formData, "showInOffer"),
    showOnHome: checkboxValue(formData, "showOnHome"),
    sortOrder: formData.get("sortOrder") || "0",
  });
}

function revalidateRegionPaths() {
  revalidatePath("/");
  revalidatePath("/admin/bolgeler");
  revalidatePath("/villalar");
}

export async function createRegion(
  _prev: RegionActionState,
  formData: FormData
): Promise<RegionActionState> {
  await requireAdmin();

  const parsed = parseRegionForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const { parentId, ...data } = parsed.data;

  const slugExists = await prisma.region.findUnique({
    where: { slug: data.slug },
  });
  if (slugExists) {
    return { error: "Bu slug zaten kullanılıyor" };
  }

  if (parentId) {
    const parent = await prisma.region.findUnique({ where: { id: parentId } });
    if (!parent) {
      return { error: "Üst bölge bulunamadı" };
    }
  }

  try {
    await prisma.region.create({
      data: {
        ...data,
        parentId: parentId ?? null,
      },
    });
    revalidateRegionPaths();
    return { success: true };
  } catch {
    return { error: "Bölge oluşturulurken bir hata oluştu" };
  }
}

export async function updateRegion(
  id: string,
  _prev: RegionActionState,
  formData: FormData
): Promise<RegionActionState> {
  await requireAdmin();

  const parsed = parseRegionForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const { parentId, ...data } = parsed.data;

  if (parentId === id) {
    return { error: "Bölge kendi üst bölgesi olamaz" };
  }

  const slugExists = await prisma.region.findFirst({
    where: { slug: data.slug, NOT: { id } },
  });
  if (slugExists) {
    return { error: "Bu slug başka bir bölgede kullanılıyor" };
  }

  if (parentId) {
    const parent = await prisma.region.findUnique({ where: { id: parentId } });
    if (!parent) {
      return { error: "Üst bölge bulunamadı" };
    }

    let cursor: string | null = parentId;
    while (cursor) {
      if (cursor === id) {
        return { error: "Döngüsel üst bölge ilişkisi oluşturulamaz" };
      }
      const node = await prisma.region.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = node?.parentId ?? null;
    }
  }

  try {
    await prisma.region.update({
      where: { id },
      data: {
        ...data,
        parentId: parentId ?? null,
      },
    });
    revalidateRegionPaths();
    return { success: true };
  } catch {
    return { error: "Bölge güncellenirken bir hata oluştu" };
  }
}

export async function deleteRegion(id: string): Promise<RegionActionState> {
  await requireAdmin();

  const region = await prisma.region.findUnique({
    where: { id },
    include: {
      _count: { select: { villas: true, children: true } },
    },
  });

  if (!region) {
    return { error: "Bölge bulunamadı" };
  }

  if (region._count.children > 0) {
    return { error: "Alt bölgeleri olan bir bölge silinemez" };
  }

  if (region._count.villas > 0) {
    return { error: "Villası olan bir bölge silinemez" };
  }

  try {
    await prisma.region.delete({ where: { id } });
    revalidateRegionPaths();
    return { success: true };
  } catch {
    return { error: "Bölge silinirken bir hata oluştu" };
  }
}
