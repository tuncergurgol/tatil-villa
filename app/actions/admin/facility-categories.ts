"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { syncAlphabeticalFacilityCategorySortOrders } from "@/lib/facility-category-sort";
import { requireAdmin } from "@/lib/auth-helpers";
import { toSurroundingSlug } from "@/lib/surrounding-utils";

export type FacilityCategoryActionState = {
  success?: boolean;
  error?: string;
};

const categorySchema = z.object({
  name: z.string().min(1, "Kategori adı gerekli"),
  slug: z
    .string()
    .min(1, "Sef URL gerekli")
    .regex(/^[a-z0-9-]+$/, "Sef URL yalnızca küçük harf, rakam ve tire içerebilir"),
  tag: z.string(),
  image: z.string(),
  description: z.string(),
  longDescription: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  seoKeywords: z.string(),
  published: z.boolean(),
  showInSearch: z.boolean(),
  showInOffer: z.boolean(),
});

function checkboxValue(formData: FormData, name: string) {
  return formData.get(name) === "true";
}

function parseCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    tag: formData.get("tag") ?? "",
    image: formData.get("image") ?? "",
    description: formData.get("description") ?? "",
    longDescription: formData.get("longDescription") ?? "",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
    seoKeywords: formData.get("seoKeywords") ?? "",
    published: checkboxValue(formData, "published"),
    showInSearch: checkboxValue(formData, "showInSearch"),
    showInOffer: checkboxValue(formData, "showInOffer"),
  });
}

function revalidateFacilityCategoryPaths() {
  revalidatePath("/admin/tanimlamalar/villa-kategorileri");
  revalidatePath("/villalar");
}

async function uniqueSlug(name: string, excludeId?: string) {
  const base = toSurroundingSlug(name) || "kategori";
  let slug = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.facilityCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

export async function createFacilityCategory(
  _prev: FacilityCategoryActionState,
  formData: FormData
): Promise<FacilityCategoryActionState> {
  await requireAdmin();

  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const slugInput = parsed.data.slug.trim();
  const slug = slugInput || (await uniqueSlug(parsed.data.name));

  const slugTaken = await prisma.facilityCategory.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (slugTaken) {
    return { error: "Bu Sef URL zaten kullanılıyor" };
  }

  try {
    await prisma.facilityCategory.create({
      data: {
        name: parsed.data.name.trim(),
        slug,
        tag: parsed.data.tag.trim(),
        image: parsed.data.image.trim(),
        description: parsed.data.description.trim(),
        longDescription: parsed.data.longDescription.trim(),
        seoTitle: parsed.data.seoTitle.trim(),
        seoDescription: parsed.data.seoDescription.trim(),
        seoKeywords: parsed.data.seoKeywords.trim(),
        published: parsed.data.published,
        showInSearch: parsed.data.showInSearch,
        showInOffer: parsed.data.showInOffer,
        sortOrder: 0,
      },
    });
    await syncAlphabeticalFacilityCategorySortOrders();
    revalidateFacilityCategoryPaths();
    return { success: true };
  } catch {
    return { error: "Kategori oluşturulamadı" };
  }
}

export async function updateFacilityCategory(
  _prev: FacilityCategoryActionState,
  formData: FormData
): Promise<FacilityCategoryActionState> {
  await requireAdmin();

  const id = formData.get("id") as string;
  if (!id) return { error: "Kayıt bulunamadı" };

  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const slugInput = parsed.data.slug.trim();
  const slug = slugInput || (await uniqueSlug(parsed.data.name, id));

  const slugTaken = await prisma.facilityCategory.findFirst({
    where: { slug, NOT: { id } },
    select: { id: true },
  });
  if (slugTaken) {
    return { error: "Bu Sef URL zaten kullanılıyor" };
  }

  try {
    await prisma.facilityCategory.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        slug,
        tag: parsed.data.tag.trim(),
        image: parsed.data.image.trim(),
        description: parsed.data.description.trim(),
        longDescription: parsed.data.longDescription.trim(),
        seoTitle: parsed.data.seoTitle.trim(),
        seoDescription: parsed.data.seoDescription.trim(),
        seoKeywords: parsed.data.seoKeywords.trim(),
        published: parsed.data.published,
        showInSearch: parsed.data.showInSearch,
        showInOffer: parsed.data.showInOffer,
      },
    });
    await syncAlphabeticalFacilityCategorySortOrders();
    revalidateFacilityCategoryPaths();
    return { success: true };
  } catch {
    return { error: "Kategori güncellenemedi" };
  }
}

export async function deleteFacilityCategory(
  id: string
): Promise<FacilityCategoryActionState> {
  await requireAdmin();

  try {
    await prisma.facilityCategory.delete({ where: { id } });
    await syncAlphabeticalFacilityCategorySortOrders();
    revalidateFacilityCategoryPaths();
    return { success: true };
  } catch {
    return { error: "Kategori silinemedi" };
  }
}
