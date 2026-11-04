import { prisma } from "@/lib/db";

export type CustomerContactChannelItem = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export async function getCustomerContactChannelsForPicker() {
  const items = await prisma.customerContactChannel.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  return items.filter(
    (item) => item.name.trim().toLocaleLowerCase("tr-TR") !== "rezervasyon"
  );
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
