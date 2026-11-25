"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { isValidCompanyPaymentType } from "@/lib/company-payment-types";
import { isValidTurkishIban, normalizeIban } from "@/lib/iban";

export type CompanyBankAccountActionState = {
  success?: boolean;
  error?: string;
};

const itemSchema = z.object({
  paymentType: z
    .string()
    .min(1, "Ödeme türü seçiniz")
    .refine(isValidCompanyPaymentType, "Geçersiz ödeme türü"),
  bankName: z.string().min(1, "Banka adı gerekli"),
  accountHolder: z.string().min(1, "Hesap sahibi gerekli"),
  iban: z
    .string()
    .min(1, "IBAN gerekli")
    .transform((value) => normalizeIban(value))
    .refine(
      isValidTurkishIban,
      "IBAN 26 hane olmalı (TR + 24 rakam, GİB BTRANS)"
    ),
});

function revalidatePaths() {
  revalidatePath("/admin/acente/sirket");
}

function parseFormData(formData: FormData) {
  return itemSchema.safeParse({
    paymentType: formData.get("paymentType"),
    bankName: formData.get("bankName"),
    accountHolder: formData.get("accountHolder"),
    iban: formData.get("iban"),
  });
}

export async function createCompanyBankAccount(
  _prev: CompanyBankAccountActionState,
  formData: FormData
): Promise<CompanyBankAccountActionState> {
  await requireAdmin();

  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
  }

  try {
    const maxSort = await prisma.companyBankAccount.aggregate({
      _max: { sortOrder: true },
    });

    await prisma.companyBankAccount.create({
      data: {
        paymentType: parsed.data.paymentType,
        bankName: parsed.data.bankName.trim(),
        accountHolder: parsed.data.accountHolder.trim(),
        iban: parsed.data.iban,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt oluşturulamadı" };
  }
}

export async function updateCompanyBankAccount(
  _prev: CompanyBankAccountActionState,
  formData: FormData
): Promise<CompanyBankAccountActionState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const parsed = parseFormData(formData);
  if (!id || !parsed.success) {
    return {
      error: parsed.success
        ? "Geçersiz form verisi"
        : (parsed.error.issues[0]?.message ?? "Geçersiz form verisi"),
    };
  }

  try {
    await prisma.companyBankAccount.update({
      where: { id },
      data: {
        paymentType: parsed.data.paymentType,
        bankName: parsed.data.bankName.trim(),
        accountHolder: parsed.data.accountHolder.trim(),
        iban: parsed.data.iban,
      },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt güncellenemedi" };
  }
}

export async function deleteCompanyBankAccount(
  id: string
): Promise<CompanyBankAccountActionState> {
  await requireAdmin();

  try {
    await prisma.companyBankAccount.update({
      where: { id },
      data: { active: false },
    });
    revalidatePaths();
    return { success: true };
  } catch {
    return { error: "Kayıt silinemedi" };
  }
}
