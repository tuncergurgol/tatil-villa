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

/**
 * Rezervasyon `siteInfo` adına göre acente sitesi domain'i.
 * Eşleşme yoksa null (çağıran şirket domain'ine düşer).
 */
export async function resolveAgencySiteDomainBySiteInfo(
  siteInfo: string | null | undefined
): Promise<string | null> {
  const name = siteInfo?.trim() || "";
  if (!name) return null;

  const sites = await prisma.agencySite.findMany({
    where: { active: true },
    select: { name: true, domain: true },
  });

  const match = sites.find(
    (site) =>
      site.name.localeCompare(name, "tr", { sensitivity: "base" }) === 0
  );
  const domain = match?.domain?.trim() || "";
  return domain || null;
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
