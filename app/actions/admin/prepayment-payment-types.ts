"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export type PrepaymentPaymentTypeActionState = {
  success?: boolean;
  error?: string;
};

const itemSchema = z.object({
  name: z.string().min(1, "Ad gerekli"),
});

function revalidatePaths() {
  revalidatePath("/admin/tanimlamalar/on-odeme-odeme-tipleri");
  revalidatePath("/admin/villalar");
}

export async function createPrepaymentPaymentType(
  _prev: PrepaymentPaymentTypeActionState,
  formData: FormData
): Promise<PrepaymentPaymentTypeActionState> {
  await requireAdmin();

  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    const maxSort = await prisma.prepaymentPaymentTypeOption.aggregate({
      _max: { sortOrder: true },
    });

    await prisma.prepaymentPaymentTypeOption.create({
      data: {
        name: parsed.data.name.trim(),
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt oluşturulamadı" };
  }
}

export async function updatePrepaymentPaymentType(
  _prev: PrepaymentPaymentTypeActionState,
  formData: FormData
): Promise<PrepaymentPaymentTypeActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
  });
  if (!id || !parsed.success) {
    return {
      error: parsed.success
        ? "Geçersiz form verisi"
        : (parsed.error.issues[0]?.message ?? "Geçersiz form verisi"),
    };
  }

  try {
    await prisma.prepaymentPaymentTypeOption.update({
      where: { id },
      data: { name: parsed.data.name.trim() },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt güncellenemedi" };
  }
}

export async function deletePrepaymentPaymentType(
  id: string
): Promise<PrepaymentPaymentTypeActionState> {
  await requireAdmin();

  try {
    await prisma.prepaymentPaymentTypeOption.update({
      where: { id },
      data: { active: false },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt silinemedi" };
  }
}
