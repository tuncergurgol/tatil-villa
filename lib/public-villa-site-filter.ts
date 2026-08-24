import type { Prisma, TourismDocumentType } from "@prisma/client";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  isPublicSiteKey,
  type PublicSiteKey,
} from "@/lib/public-site-keys";
import { hasVillaTourismDocument } from "@/lib/villa-document-types";

let cachedAllowedSiteKeys: {
  keys: PublicSiteKey[];
  at: number;
} | null = null;
const ALLOWED_SITE_KEYS_TTL_MS = 5_000;

export function invalidatePublishUndocumentedVillaSiteKeysCache() {
  cachedAllowedSiteKeys = null;
}

export async function getPublishUndocumentedVillaSiteKeys(): Promise<
  PublicSiteKey[]
> {
  const now = Date.now();
  if (
    cachedAllowedSiteKeys &&
    now - cachedAllowedSiteKeys.at < ALLOWED_SITE_KEYS_TTL_MS
  ) {
    return cachedAllowedSiteKeys.keys;
  }

  const settings = await getCompanySettings();
  const raw = Array.isArray(settings.publishUndocumentedVillaSiteKeys)
    ? settings.publishUndocumentedVillaSiteKeys
    : [];
  const keys = raw.filter(isPublicSiteKey);
  cachedAllowedSiteKeys = { keys, at: now };
  return keys;
}

export function publicSiteRequiresTourismDocument(
  siteKey: PublicSiteKey | null | undefined,
  allowedSiteKeys: readonly PublicSiteKey[]
): boolean {
  if (!siteKey) return false;
  return !allowedSiteKeys.includes(siteKey);
}

export function hasPublicTourismDocument(villa: {
  documentNo: string;
  documentType: TourismDocumentType | null;
}): boolean {
  return hasVillaTourismDocument(villa);
}

function tourismDocumentWhere(): Prisma.VillaWhereInput {
  return {
    OR: [{ documentNo: { not: "" } }, { documentType: { not: null } }],
  };
}

/** Belge no/türü olmayan villalar, izin verilmeyen public sitelerde görünmez. */
export function publicVillaTourismDocumentWhere(
  siteKey: PublicSiteKey | null | undefined,
  allowedSiteKeys: readonly PublicSiteKey[]
): Prisma.VillaWhereInput {
  if (!siteKey || !publicSiteRequiresTourismDocument(siteKey, allowedSiteKeys)) {
    return {};
  }
  return tourismDocumentWhere();
}

export function withPublicSiteVillaFilter<T extends Prisma.VillaWhereInput>(
  where: T,
  siteKey: PublicSiteKey | null | undefined,
  allowedSiteKeys: readonly PublicSiteKey[]
): T | Prisma.VillaWhereInput {
  const siteFilter = publicVillaTourismDocumentWhere(siteKey, allowedSiteKeys);
  if (!siteFilter.OR) return where;
  return { AND: [where, siteFilter] };
}

export async function resolvePublicSiteVillaFilter<
  T extends Prisma.VillaWhereInput,
>(
  where: T,
  siteKey?: PublicSiteKey | null
): Promise<T | Prisma.VillaWhereInput> {
  const allowedSiteKeys = await getPublishUndocumentedVillaSiteKeys();
  return withPublicSiteVillaFilter(where, siteKey, allowedSiteKeys);
}

export function isVillaVisibleOnPublicSite(
  villa: {
    active: boolean;
    documentNo: string;
    documentType: TourismDocumentType | null;
  },
  siteKey: PublicSiteKey,
  allowedSiteKeys: readonly PublicSiteKey[]
): boolean {
  if (!villa.active) return false;
  if (!publicSiteRequiresTourismDocument(siteKey, allowedSiteKeys)) return true;
  return hasPublicTourismDocument(villa);
}
