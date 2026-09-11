import { prisma } from "@/lib/db";

export type CustomerContactChannelItem = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export async function getCustomerContactChannelsForPicker() {
  return prisma.customerContactChannel.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

export async function getCustomerContactChannelAdminData() {
  const items = await prisma.customerContactChannel.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sortOrder: true,
      active: true,
    },
  });

  return {
    items: items as CustomerContactChannelItem[],
    totalCount: items.length,
    activeCount: items.filter((item) => item.active).length,
    passiveCount: items.filter((item) => !item.active).length,
  };
}
