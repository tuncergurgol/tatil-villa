"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { syncAlphabeticalPriceInclusionSortOrders } from "@/lib/price-inclusion-sort";
import { requireAdmin } from "@/lib/auth-helpers";

export type PriceInclusionActionState = {
  success?: boolean;
  error?: string;
};

const itemSchema = z.object({
  description: z.string().min(1, "Açıklama gerekli"),
  type: z.enum(["INCLUDED", "EXCLUDED"]),
  isDefault: z.enum(["true", "false"]).transform((v) => v === "true"),
});

function revalidatePriceInclusionPaths() {
  revalidatePath("/admin/tanimlamalar/fiyata-dahil");
}

export async function createPriceInclusionItem(
  _prev: PriceInclusionActionState,
  formData: FormData
): Promise<PriceInclusionActionState> {
  await requireAdmin();

  const parsed = itemSchema.safeParse({
    description: formData.get("description"),
    type: formData.get("type"),
    isDefault: formData.get("isDefault") ?? "false",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    await prisma.priceInclusionItem.create({
      data: {
        description: parsed.data.description.trim(),
        type: parsed.data.type,
        isDefault: parsed.data.isDefault,
        sortOrder: 0,
      },
    });
    await syncAlphabeticalPriceInclusionSortOrders(parsed.data.type);
    revalidatePriceInclusionPaths();
    return { success: true };
  } catch {
    return { error: "Kayıt oluşturulamadı" };
  }
}

export async function updatePriceInclusionItem(
  _prev: PriceInclusionActionState,
  formData: FormData
): Promise<PriceInclusionActionState> {
  await requireAdmin();

  const id = formData.get("id") as string;
  if (!id) return { error: "Kayıt bulunamadı" };

  const parsed = itemSchema.safeParse({
    description: formData.get("description"),
    type: formData.get("type"),
    isDefault: formData.get("isDefault") ?? "false",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  const existing = await prisma.priceInclusionItem.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!existing) return { error: "Kayıt bulunamadı" };

  try {
    await prisma.priceInclusionItem.update({
      where: { id },
      data: {
        description: parsed.data.description.trim(),
        type: parsed.data.type,
        isDefault: parsed.data.isDefault,
      },
    });
    await syncAlphabeticalPriceInclusionSortOrders(parsed.data.type);
    if (existing.type !== parsed.data.type) {
      await syncAlphabeticalPriceInclusionSortOrders(existing.type);
    }
    revalidatePriceInclusionPaths();
    return { success: true };
  } catch {
    return { error: "Kayıt güncellenemedi" };
  }
}

export async function deletePriceInclusionItem(
  id: string
): Promise<PriceInclusionActionState> {
  await requireAdmin();

  const existing = await prisma.priceInclusionItem.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!existing) return { error: "Kayıt bulunamadı" };

  try {
    await prisma.priceInclusionItem.delete({ where: { id } });
    await syncAlphabeticalPriceInclusionSortOrders(existing.type);
    revalidatePriceInclusionPaths();
    return { success: true };
  } catch {
    return { error: "Kayıt silinemedi" };
  }
}

export async function togglePriceInclusionDefault(
  id: string
): Promise<PriceInclusionActionState> {
  await requireAdmin();

  const item = await prisma.priceInclusionItem.findUnique({
    where: { id },
    select: { isDefault: true },
  });
  if (!item) return { error: "Kayıt bulunamadı" };

  try {
    await prisma.priceInclusionItem.update({
      where: { id },
      data: { isDefault: !item.isDefault },
    });
    revalidatePriceInclusionPaths();
    return { success: true };
  } catch {
    return { error: "Varsayılan durumu güncellenemedi" };
  }
}
