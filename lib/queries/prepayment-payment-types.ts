import { prisma } from "@/lib/db";

export type PrepaymentPaymentTypeItem = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export async function getPrepaymentPaymentTypesForPicker() {
  return prisma.prepaymentPaymentTypeOption.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

export async function getPrepaymentPaymentTypeAdminData() {
  const items = await prisma.prepaymentPaymentTypeOption.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sortOrder: true,
      active: true,
    },
  });

  return {
    items: items as PrepaymentPaymentTypeItem[],
    totalCount: items.length,
    activeCount: items.filter((item) => item.active).length,
  };
}
