"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RegionLevel, isValidParentLevel, parentLevelFor } from "@/lib/region-levels";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { collectDescendantIds } from "@/lib/queries/region-tree";
import { syncAlphabeticalSiblingSortOrders } from "@/lib/region-sort";
import { getMernisIlceByCode } from "@/lib/mernis-ilce";

export type RegionActionState = {
  success?: boolean;
  error?: string;
};

const regionSchema = z.object({
  name: z.string().min(1, "Bölge adı gerekli"),
  level: z.nativeEnum(RegionLevel),
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
  mernisIlceCode: z.string().optional(),
});

function checkboxValue(formData: FormData, name: string) {
  return formData.get(name) === "true";
}

function parseRegionForm(formData: FormData) {
  const parentId = (formData.get("parentId") as string | null)?.trim();
  const published = checkboxValue(formData, "published");
  const mernisRaw = (formData.get("mernisIlceCode") as string | null)?.trim();

  return regionSchema.safeParse({
    name: formData.get("name"),
    level: formData.get("level"),
    slug: formData.get("slug"),
    image: formData.get("image"),
    description: formData.get("description"),
    longDescription: formData.get("longDescription"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
    seoKeywords: formData.get("seoKeywords"),
    parentId: parentId || undefined,
    published,
    active: published,
    showInSearch: checkboxValue(formData, "showInSearch"),
    showInOffer: checkboxValue(formData, "showInOffer"),
    showOnHome: checkboxValue(formData, "showOnHome"),
    sortOrder: formData.get("sortOrder") || "0",
    mernisIlceCode: mernisRaw || undefined,
  });
}

function revalidateRegionPaths() {
  revalidatePath("/");
  revalidatePath("/admin/bolgeler");
  revalidatePath("/villalar");
}

async function validateRegionHierarchy(
  level: RegionLevel,
  parentId: string | undefined,
  regionId?: string
): Promise<RegionActionState | null> {
  if (level === RegionLevel.IL && parentId) {
    return { error: "İl kayıtlarının üst bölgesi olamaz" };
  }

  if (level !== RegionLevel.IL && !parentId) {
    return { error: `${level === RegionLevel.ILCE ? "İlçe" : "Mahalle"} için üst bölge seçilmelidir` };
  }

  if (!parentId) return null;

  const parent = await prisma.region.findUnique({
    where: { id: parentId },
    select: { level: true },
  });

  if (!parent) {
    return { error: "Üst bölge bulunamadı" };
  }

  if (!isValidParentLevel(level, parent.level)) {
    const expected = parentLevelFor(level);
    return {
      error: `Bu seviye için üst bölge ${expected === RegionLevel.IL ? "İl" : "İlçe"} olmalıdır`,
    };
  }

  if (regionId && parentId === regionId) {
    return { error: "Bölge kendi üst bölgesi olamaz" };
  }

  if (regionId) {
    let cursor: string | null = parentId ?? null;
    while (cursor) {
      if (cursor === regionId) {
        return { error: "Döngüsel üst bölge ilişkisi oluşturulamaz" };
      }
      const parent: { parentId: string | null } | null =
        await prisma.region.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
      cursor = parent?.parentId ?? null;
    }
  }

  return null;
}

function resolveMernisIlceCode(
  level: RegionLevel,
  code: string | undefined
): { value: string | null; error?: string } {
  if (level !== RegionLevel.ILCE) {
    return { value: null };
  }

  if (!code) {
    return {
      value: null,
      error: "İlçe seviyesindeki bölgeler için MERNİS il/ilçe kodu seçilmelidir",
    };
  }

  const item = getMernisIlceByCode(code);
  if (!item) {
    return { value: null, error: "Geçersiz MERNİS il/ilçe kodu" };
  }

  return { value: item.code };
}

async function validateNoActiveDescendants(
  regionId: string,
  publishing: boolean
): Promise<RegionActionState | null> {
  if (publishing) return null;

  const nodes = await prisma.region.findMany({
    select: { id: true, parentId: true, published: true, name: true },
  });

  const descendantIds = collectDescendantIds(regionId, nodes);
  const activeDescendants = nodes.filter(
    (node) =>
      node.id !== regionId && descendantIds.includes(node.id) && node.published
  );

  if (activeDescendants.length === 0) return null;

  const preview = activeDescendants
    .slice(0, 5)
    .map((node) => node.name)
    .join(", ");
  const remaining = activeDescendants.length - 5;

  return {
    error:
      remaining > 0
        ? `Bu bölge pasife alınamaz. Altında yayında ${activeDescendants.length} bölge var (ör. ${preview} ve ${remaining} bölge daha). Önce alt bölgeleri pasife alın.`
        : `Bu bölge pasife alınamaz. Altında yayında bölge(ler) var: ${preview}. Önce alt bölgeleri pasife alın.`,
  };
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

  const { parentId, level, published, mernisIlceCode, ...data } = parsed.data;

  const hierarchyError = await validateRegionHierarchy(level, parentId);
  if (hierarchyError) return hierarchyError;

  const mernisResult = resolveMernisIlceCode(level, mernisIlceCode);
  if (mernisResult.error) return { error: mernisResult.error };

  const slugExists = await prisma.region.findUnique({
    where: { slug: data.slug },
  });
  if (slugExists) {
    return { error: "Bu slug zaten kullanılıyor" };
  }

  try {
    await prisma.region.create({
      data: {
        ...data,
        published,
        active: published,
        level,
        parentId: parentId ?? null,
        mernisIlceCode: mernisResult.value,
      },
    });

    if (level === RegionLevel.ILCE || level === RegionLevel.MAHALLE) {
      await syncAlphabeticalSiblingSortOrders(parentId ?? null, level);
    }

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

  const { parentId, level, published, mernisIlceCode, ...data } = parsed.data;

  const hierarchyError = await validateRegionHierarchy(level, parentId, id);
  if (hierarchyError) return hierarchyError;

  const deactivationError = await validateNoActiveDescendants(id, published);
  if (deactivationError) return deactivationError;

  const mernisResult = resolveMernisIlceCode(level, mernisIlceCode);
  if (mernisResult.error) return { error: mernisResult.error };

  const slugExists = await prisma.region.findFirst({
    where: { slug: data.slug, NOT: { id } },
  });
  if (slugExists) {
    return { error: "Bu slug başka bir bölgede kullanılıyor" };
  }

  try {
    const existing = await prisma.region.findUnique({
      where: { id },
      select: { parentId: true, level: true },
    });

    await prisma.region.update({
      where: { id },
      data: {
        ...data,
        published,
        active: published,
        level,
        parentId: parentId ?? null,
        mernisIlceCode: mernisResult.value,
      },
    });

    if (level === RegionLevel.ILCE || level === RegionLevel.MAHALLE) {
      await syncAlphabeticalSiblingSortOrders(parentId ?? null, level);
      if (
        existing &&
        (existing.parentId !== (parentId ?? null) || existing.level !== level)
      ) {
        await syncAlphabeticalSiblingSortOrders(existing.parentId, existing.level);
      }
    }

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
