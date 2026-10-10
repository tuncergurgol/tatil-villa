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

function visibleOnSite(siteKeys: string[], siteKey?: string | null) {
  if (!siteKey || siteKeys.length === 0) return true;
  return siteKeys.includes(siteKey);
}

export async function getSiteMenuItemsForPublic(
  key: string,
  siteKey?: string | null
) {
  const menu = await getSiteMenuByKey(key);
  if (!menu) return [];

  return menu.items
    .filter((item) => visibleOnSite(item.siteKeys, siteKey))
    .map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      openInNewTab: item.openInNewTab,
      children: item.children
        .filter((child) => visibleOnSite(child.siteKeys, siteKey))
        .map((child) => ({
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
