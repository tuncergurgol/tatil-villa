"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { syncAllCustomerLoyaltyFromStays } from "@/lib/customer-loyalty";
import { LOYALTY_RULES } from "@/lib/loyalty-config";

export type LoyaltyActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

function revalidateLoyaltyPaths() {
  revalidatePath("/admin/musteri-yonetimi/sadakat");
  revalidatePath("/admin/musteri-yonetimi");
}

export async function syncLoyaltyTiersAction(): Promise<LoyaltyActionState> {
  await requireAdmin();

  try {
    const result = await syncAllCustomerLoyaltyFromStays();
    revalidateLoyaltyPaths();
    return {
      success: true,
      message: `${result.memberAccountsUpdated} üye güncellendi · ${result.unchanged} değişmedi · ${result.withStays} konaklamalı müşteri`,
    };
  } catch {
    return { error: "Sadakat seviyeleri senkronize edilemedi" };
  }
}

const manualVoucherSchema = z.object({
  memberId: z.string().trim().min(1, "Üye seçin"),
  amount: z.coerce.number().int().min(1, "Tutar en az 1 TL olmalı"),
  validityDays: z.coerce
    .number()
    .int()
    .min(1)
    .max(730)
    .default(LOYALTY_RULES.voucherValidityDays),
});

export async function createManualLoyaltyVoucherAction(
  formData: FormData
): Promise<LoyaltyActionState> {
  await requireAdmin();

  const parsed = manualVoucherSchema.safeParse({
    memberId: formData.get("memberId"),
    amount: formData.get("amount"),
    validityDays:
      formData.get("validityDays") || LOYALTY_RULES.voucherValidityDays,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form" };
  }

  const member = await prisma.memberAccount.findUnique({
    where: { id: parsed.data.memberId },
    select: { id: true },
  });
  if (!member) return { error: "Üye bulunamadı" };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parsed.data.validityDays);

  try {
    await prisma.loyaltyVoucher.create({
      data: {
        memberId: member.id,
        amount: parsed.data.amount,
        remainingAmount: parsed.data.amount,
        type: "MANUAL",
        expiresAt,
      },
    });
    revalidateLoyaltyPaths();
    return { success: true, message: "Manuel sadakat çeki oluşturuldu" };
  } catch {
    return { error: "Çek oluşturulamadı" };
  }
}
