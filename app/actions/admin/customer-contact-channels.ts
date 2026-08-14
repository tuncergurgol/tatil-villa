"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

export type CustomerContactChannelActionState = {
  success?: boolean;
  error?: string;
};

const itemSchema = z.object({
  name: z.string().min(1, "Ad gerekli"),
});

function revalidatePaths() {
  revalidatePath("/admin/acente/sirket");
  revalidatePath("/admin/konaklama/uygunluk");
}

export async function createCustomerContactChannel(
  _prev: CustomerContactChannelActionState,
  formData: FormData
): Promise<CustomerContactChannelActionState> {
  await requireAdmin();

  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    const maxSort = await prisma.customerContactChannel.aggregate({
      _max: { sortOrder: true },
    });

    await prisma.customerContactChannel.create({
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

export async function updateCustomerContactChannel(
  _prev: CustomerContactChannelActionState,
  formData: FormData
): Promise<CustomerContactChannelActionState> {
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
    await prisma.customerContactChannel.update({
      where: { id },
      data: { name: parsed.data.name.trim() },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt güncellenemedi" };
  }
}

export async function deleteCustomerContactChannel(
  id: string
): Promise<CustomerContactChannelActionState> {
  await requireAdmin();

  try {
    await prisma.customerContactChannel.update({
      where: { id },
      data: { active: false },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt silinemedi" };
  }
}
