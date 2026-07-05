import type { VillaCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getVillaShowcaseImage } from "@/lib/villa-gallery";
import { getRegionIdsForFilter } from "@/lib/queries/region-tree";

export interface VillaFilters {
  filter?: string;
  region?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
}

export type VillaWithRegion = Awaited<ReturnType<typeof getVillaBySlug>>;

function mapVilla(
  villa: {
    id: string;
    slug: string;
    name: string;
    category: VillaCategory;
    location: string;
    guests: number;
    bedrooms: number;
    bathrooms: number;
    pricePerNight: number | null;
    image: string;
    images: string[];
    description: string;
    amenities: string[];
    featured: boolean;
    popular: boolean;
    deal: boolean;
    recommended: boolean;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    region: { slug: string; name: string };
  } | null
) {
  if (!villa) return null;
  return {
    id: villa.id,
    slug: villa.slug,
    name: villa.name,
    category: villa.category,
    region: villa.region.slug,
    regionName: villa.region.name,
    location: villa.location,
    guests: villa.guests,
    bedrooms: villa.bedrooms,
    bathrooms: villa.bathrooms,
    pricePerNight: villa.pricePerNight,
    image: getVillaShowcaseImage(villa),
    images: villa.images,
    description: villa.description,
    amenities: villa.amenities,
    featured: villa.featured,
    popular: villa.popular,
    deal: villa.deal,
    recommended: villa.recommended,
    seoTitle: villa.seoTitle,
    seoDescription: villa.seoDescription,
    seoKeywords: villa.seoKeywords,
  };
}

export async function getVillas(filters: VillaFilters = {}) {
  const where: Record<string, unknown> = {};

  if (filters.filter === "popular") where.popular = true;
  if (filters.filter === "deal") where.deal = true;
  if (filters.filter === "recommended") where.recommended = true;
  if (filters.region) {
    const regionIds = await getRegionIdsForFilter(filters.region);
    if (regionIds?.length) {
      where.regionId = { in: regionIds };
    } else {
      where.region = { slug: filters.region };
    }
  }

  const villas = await prisma.villa.findMany({
    where,
    include: { region: true },
    orderBy: { name: "asc" },
  });

  let result = villas.map((v) => mapVilla(v)!);

  if (filters.checkIn && filters.checkOut) {
    const checkIn = new Date(filters.checkIn);
    const checkOut = new Date(filters.checkOut);
    const availableIds = await getAvailableVillaIds(checkIn, checkOut);
    result = result.filter((v) => availableIds.has(v.id));
  }

  if (filters.adults) {
    result = result.filter((v) => v.guests >= filters.adults!);
  }

  return result;
}

export async function getVillaBySlug(slug: string) {
  const villa = await prisma.villa.findUnique({
    where: { slug },
    include: { region: true },
  });
  return mapVilla(villa);
}

export async function getPopularVillas() {
  return getVillas({ filter: "popular" });
}

export async function getDealVillas() {
  return getVillas({ filter: "deal" });
}

export async function getRecommendedVillas() {
  return getVillas({ filter: "recommended" });
}

async function getAvailableVillaIds(checkIn: Date, checkOut: Date) {
  const conflicting = await prisma.booking.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    select: { villaId: true },
  });

  const blockedIds = new Set(conflicting.map((b) => b.villaId));
  const allVillas = await prisma.villa.findMany({ select: { id: true } });
  return new Set(allVillas.filter((v) => !blockedIds.has(v.id)).map((v) => v.id));
}

export async function getVillaCount() {
  return prisma.villa.count();
}
