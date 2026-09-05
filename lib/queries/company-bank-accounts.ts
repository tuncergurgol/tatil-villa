import { prisma } from "@/lib/db";
import { normalizeIban } from "@/lib/iban";

export type CompanyBankAccountItem = {
  id: string;
  paymentType: string;
  bankName: string;
  accountHolder: string;
  iban: string;
  sortOrder: number;
  active: boolean;
};

export async function getCompanyBankAccountAdminData() {
  const items = await prisma.companyBankAccount.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      paymentType: true,
      bankName: true,
      accountHolder: true,
      iban: true,
      sortOrder: true,
      active: true,
    },
  });

  return {
    items,
    totalCount: items.length,
  };
}

/**
 * BTRANS komisyon IBAN: aktif Banka Havale/EFT hesabı.
 * Eski CompanySettings.iban alanı formdan kaldırıldığı için yedek olarak kalır.
 */
export async function resolveCompanyCommissionIban(
  fallbackIban?: string | null
): Promise<string> {
  const bankAccount = await prisma.companyBankAccount.findFirst({
    where: {
      active: true,
      OR: [{ paymentType: "bank_transfer" }, { paymentType: "" }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { iban: true },
  });

  return normalizeIban(bankAccount?.iban || fallbackIban);
}