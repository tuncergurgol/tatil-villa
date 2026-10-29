/**
 * Faz 0 — Matris / kategori SEO kuralları (4 public site ortak).
 *
 * URL deseni: /kategori/{region}-{facilitySlug}  veya  /kategori/{facilitySlug}
 * Stok eşiği altında noindex (veya sitemap dışı).
 * Parametrik /villalar?facilities=… faceted kaldığı için indekslenmez.
 */

import type { PublicSiteKey } from "@/lib/public-site-keys";

/** Indexlenebilir matris için minimum aktif villa. */
export const SEO_MATRIX_MIN_STOCK = 3;

/** İlk dalga yüksek niyet bölgeleri. */
export const SEO_MATRIX_REGION_SLUGS = [
  "kalkan",
  "fethiye",
  "kas",
  "oludeniz",
  "islamlar",
  "bodrum",
  "marmaris",
  "dalyan",
] as const;

/** İlk dalga tesis/konsept slug’ları (FacilityCategory.slug). */
export const SEO_MATRIX_FACILITY_SLUGS = [
  "isitmali-havuzlu-villalar",
  "jakuzili-villalar",
  "muhafazakar-villalar",
  "balayi-villalari",
  "cocuk-havuzlu-villalar",
  "deniz-manzarali-villalar",
  "kapali-havuzlu-villalar",
  "ozel-havuzlu-villalar",
] as const;

/** Glamping sitesi için ek / alternatif tesis. */
export const SEO_MATRIX_GLAMPING_FACILITY_SLUGS = [
  "bungalov",
  "deniz-manzarali-villalar",
  "doga-icinde-villalar",
  "jakuzili-villalar",
] as const;

/**
 * Bölge rehber hub’ları: /gezi-rehberi/{slug}
 * Not: /rehber/* eski CRM yolları için legacy 301 → /blog; yeni hub çakışmasın.
 */
export const SEO_GUIDE_REGION_SLUGS = [
  "kalkan",
  "kas",
  "fethiye",
  "oludeniz",
  "islamlar",
  "bodrum",
  "marmaris",
  "dalyan",
] as const;

export type SeoMatrixRegionSlug = (typeof SEO_MATRIX_REGION_SLUGS)[number];
export type SeoMatrixFacilitySlug = (typeof SEO_MATRIX_FACILITY_SLUGS)[number];

export type ParsedSeoCategorySlug =
  | { kind: "facility"; facilitySlug: string }
  | { kind: "matrix"; regionSlug: string; facilitySlug: string };

export function matrixFacilitiesForSite(
  siteKey: PublicSiteKey
): readonly string[] {
  if (siteKey === "glamping-turkey") {
    return SEO_MATRIX_GLAMPING_FACILITY_SLUGS;
  }
  return SEO_MATRIX_FACILITY_SLUGS;
}

export function buildMatrixCategorySlug(
  regionSlug: string,
  facilitySlug: string
): string {
  return `${regionSlug.trim()}-${facilitySlug.trim()}`;
}

export function buildCategoryPath(slug: string): string {
  return `/kategori/${slug}`;
}

export function buildGuidePath(regionSlug: string): string {
  return `/gezi-rehberi/${regionSlug}`;
}

/**
 * `kalkan-isitmali-havuzlu-villalar` → region + facility
 * `isitmali-havuzlu-villalar` → facility only
 */
export function parseSeoCategorySlug(
  raw: string,
  knownFacilitySlugs: readonly string[],
  knownRegionSlugs: readonly string[] = SEO_MATRIX_REGION_SLUGS
): ParsedSeoCategorySlug | null {
  const slug = raw.trim().toLowerCase();
  if (!slug) return null;

  if (knownFacilitySlugs.includes(slug)) {
    return { kind: "facility", facilitySlug: slug };
  }

  const facilities = [...knownFacilitySlugs].sort((a, b) => b.length - a.length);
  for (const facilitySlug of facilities) {
    const prefix = `-${facilitySlug}`;
    if (!slug.endsWith(prefix)) continue;
    const regionSlug = slug.slice(0, -prefix.length);
    if (!regionSlug || !knownRegionSlugs.includes(regionSlug as SeoMatrixRegionSlug)) {
      // Bölge allowlist dışıysa da geçerli region slug kabul et (DB’de varsa sayfa çözer)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(regionSlug)) continue;
      return { kind: "matrix", regionSlug, facilitySlug };
    }
    return { kind: "matrix", regionSlug, facilitySlug };
  }

  return null;
}

export function listFirstWaveMatrixSlugs(
  siteKey: PublicSiteKey
): string[] {
  const facilities = matrixFacilitiesForSite(siteKey);
  const out: string[] = [];
  for (const facility of facilities) {
    out.push(facility);
    for (const region of SEO_MATRIX_REGION_SLUGS) {
      out.push(buildMatrixCategorySlug(region, facility));
    }
  }
  return out;
}

export function isStockIndexable(count: number): boolean {
  return count >= SEO_MATRIX_MIN_STOCK;
}
