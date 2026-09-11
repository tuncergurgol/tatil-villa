import { cache } from "react";
import { prisma } from "@/lib/db";
import { resolveBookingSiteBrand } from "@/lib/booking-site-brand";
import {
  AGENCY_SITE_SERVICE_KEYS,
  normalizeAgencySiteServices,
} from "@/lib/agency-site-services";

export type AgencySiteItem = {
  id: string;
  name: string;
  domain: string;
  sortOrder: number;
  active: boolean;
  publishedServices: string[];
};

function normalizeSiteDomain(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .replace(/^www\./i, "")
    .toLowerCase();
}

/**
 * İstek yapılan public site için yayınlanan hizmetler.
 * Eşleşen acente sitesi yoksa tüm hizmetler açık kabul edilir.
 */
export const getPublishedServicesForHost = cache(
  async function getPublishedServicesForHost(
    hostname: string
  ): Promise<string[]> {
    const target = normalizeSiteDomain(hostname);
    if (!target) return [...AGENCY_SITE_SERVICE_KEYS];

    const sites = await prisma.agencySite.findMany({
      where: { active: true },
      select: { domain: true, publishedServices: true },
    });
    const match = sites.find(
      (site) => normalizeSiteDomain(site.domain) === target
    );
    if (!match) return [...AGENCY_SITE_SERVICE_KEYS];

    return normalizeAgencySiteServices(match.publishedServices);
  }
);

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
      publishedServices: true,
    },
  });

  return {
    items: items.map((item) => ({
      ...item,
      publishedServices: normalizeAgencySiteServices(item.publishedServices),
    })) satisfies AgencySiteItem[],
    totalCount: items.length,
    activeCount: items.filter((item) => item.active).length,
    passiveCount: items.filter((item) => !item.active).length,
  };
}
