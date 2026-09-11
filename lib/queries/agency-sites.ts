import { prisma } from "@/lib/db";
import { resolveBookingSiteBrand } from "@/lib/booking-site-brand";

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
 * Rezervasyon `siteInfo` adına göre public site domain'i.
 * AgencySite + bilinen marka; admin host (bont.*) dönmez.
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

  const brand = resolveBookingSiteBrand({
    siteInfo: name,
    company: { brandName: "", domain: "", logoUrl: "" },
    agencySites: sites,
  });

  return brand.domain || null;
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
