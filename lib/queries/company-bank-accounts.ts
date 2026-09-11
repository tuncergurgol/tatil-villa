import { prisma } from "@/lib/db";

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
