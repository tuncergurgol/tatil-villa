import { prisma } from "@/lib/db";

export type AgencySiteItem = {
  id: string;
  name: string;
  domain: string;
  sortOrder: number;
  active: boolean;
};

export async function getAgencySitesForPicker() {
  return prisma.agencySite.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, domain: true },
  });
}

export async function getAgencySiteAdminData() {
  const items = await prisma.agencySite.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      domain: true,
      sortOrder: true,
      active: true,
    },
  });

  return {
    items: items as AgencySiteItem[],
    totalCount: items.length,
    activeCount: items.filter((item) => item.active).length,
    passiveCount: items.filter((item) => !item.active).length,
  };
}
