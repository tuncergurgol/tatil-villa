import type { Prisma, TourismDocumentType } from "@prisma/client";
import type { PublicSiteKey } from "@/lib/public-site-keys";

export function publicSiteRequiresTourismDocument(
  siteKey: PublicSiteKey
): boolean {
  return siteKey === "tatil-villacisi";
}

export function hasPublicTourismDocument(villa: {
  documentNo: string;
  documentType: TourismDocumentType | null;
}): boolean {
  return Boolean(villa.documentType || villa.documentNo.trim());
}

/** Tatil Villacısı: belge no/türü olmayan villalar public listede görünmez. */
export function publicVillaTourismDocumentWhere(
  siteKey?: PublicSiteKey | null
): Prisma.VillaWhereInput {
  if (!siteKey || !publicSiteRequiresTourismDocument(siteKey)) {
    return {};
  }

  return {
    OR: [{ documentNo: { not: "" } }, { documentType: { not: null } }],
  };
}

export function withPublicSiteVillaFilter<T extends Prisma.VillaWhereInput>(
  where: T,
  siteKey?: PublicSiteKey | null
): T | Prisma.VillaWhereInput {
  const siteFilter = publicVillaTourismDocumentWhere(siteKey);
  if (!siteFilter.OR) return where;
  return { AND: [where, siteFilter] };
}

export function isVillaVisibleOnPublicSite(
  villa: {
    active: boolean;
    documentNo: string;
    documentType: TourismDocumentType | null;
  },
  siteKey: PublicSiteKey
): boolean {
  if (!villa.active) return false;
  if (!publicSiteRequiresTourismDocument(siteKey)) return true;
  return hasPublicTourismDocument(villa);
}
