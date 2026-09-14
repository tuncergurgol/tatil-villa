import { prisma } from "@/lib/db";

export type SiteMenuItemTree = {
  id: string;
  label: string;
  href: string;
  openInNewTab: boolean;
  children: SiteMenuItemTree[];
};

export async function getSiteMenuByKey(key: string) {
  return prisma.siteMenu.findUnique({
    where: { key },
    include: {
      items: {
        where: { active: true, parentId: null },
        orderBy: { sortOrder: "asc" },
        include: {
          children: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });
}

export async function getSiteMenuItemsForPublic(key: string) {
  const menu = await getSiteMenuByKey(key);
  if (!menu) return [];

  return menu.items.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    openInNewTab: item.openInNewTab,
    children: item.children.map((child) => ({
      id: child.id,
      label: child.label,
      href: child.href,
      openInNewTab: child.openInNewTab,
      children: [],
    })),
  }));
}

export async function getAllSiteMenusForAdmin() {
  return prisma.siteMenu.findMany({
    orderBy: { label: "asc" },
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        include: {
          children: {
            orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
          },
        },
      },
    },
  });
}
