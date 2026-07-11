import type { VillaCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BOOKING_BLOCKING_STATUSES } from "@/lib/booking-status";
import { getVillaShowcaseImage } from "@/lib/villa-gallery";
import { getRegionIdsForFilter } from "@/lib/queries/region-tree";
import { formatVillaRegionLabel } from "@/lib/queries/villa-location";
import { facilityTypeOptions } from "@/lib/facility-type";

export interface VillaFilters {
  filter?: string;
  region?: string;
  category?: string;
  facilities?: string[];
  q?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  sort?: string;
  limit?: number;
}

const HOME_SHOWCASE_LIMIT = 12;

const regionSelect = {
  slug: true,
  name: true,
  parent: {
    select: {
      name: true,
      parent: { select: { name: true } },
    },
  },
} as const;

function getVillaOrderBy(filter?: string, sort?: string) {
  if (sort === "random") return undefined;
  if (sort === "price_asc") return { pricePerNight: "asc" as const };
  if (sort === "price_desc") return { pricePerNight: "desc" as const };
  if (sort === "guests") return { guests: "desc" as const };
  if (sort === "recommended" || filter === "recommended") {
    return { recommendedSortOrder: "asc" as const };
  }
  if (filter === "popular") return { popularSortOrder: "asc" as const };
  if (filter === "deal") return { dealSortOrder: "asc" as const };
  return { name: "asc" as const };
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
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
    region: {
      slug: string;
      name: string;
      parent?: {
        name: string;
        parent?: { name: string } | null;
      } | null;
    };
  } | null
) {
  if (!villa) return null;
  const regionLabel = formatVillaRegionLabel(villa.region);
  return {
    id: villa.id,
    slug: villa.slug,
    name: villa.name,
    category: villa.category,
    region: villa.region.slug,
    regionName: villa.region.name,
    regionLabel,
    // Kartlarda Villa Tanım bölge seçimi gösterilir
    location: regionLabel || villa.location,
    guests: villa.guests,
    bedrooms: villa.bedrooms,
    bathrooms: villa.bathrooms,
    pricePerNight: villa.pricePerNight,
    minNightlyPrice: null as number | null,
    maxNightlyPrice: null as number | null,
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
  const where: Record<string, unknown> = { active: true };

  if (filters.filter === "popular") where.popular = true;
  if (filters.filter === "deal") where.deal = true;
  if (filters.filter === "recommended") where.recommended = true;
  if (
    filters.category === "villa" ||
    filters.category === "apart" ||
    filters.category === "suit_daire"
  ) {
    where.category = filters.category;
  }
  if (filters.region) {
    const regionIds = await getRegionIdsForFilter(filters.region);
    if (regionIds?.length) {
      where.regionId = { in: regionIds };
    } else {
      where.region = { slug: filters.region };
    }
  }

  const query = filters.q?.trim();
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { originalName: { contains: query, mode: "insensitive" } },
      { location: { contains: query, mode: "insensitive" } },
    ];
  }

  if (filters.amenities && filters.amenities.length > 0) {
    where.amenities = { hasEvery: filters.amenities };
  }

  if (filters.facilities && filters.facilities.length > 0) {
    where.facilityCategories = { hasEvery: filters.facilities };
  }

  if (filters.minPrice != null || filters.maxPrice != null) {
    where.pricePerNight = {
      ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
    };
  }

  const isRandom = filters.sort === "random";
  const orderBy = getVillaOrderBy(filters.filter, filters.sort);

  const villas = await prisma.villa.findMany({
    where,
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      location: true,
      guests: true,
      bedrooms: true,
      bathrooms: true,
      pricePerNight: true,
      image: true,
      featured: true,
      popular: true,
      deal: true,
      recommended: true,
      amenities: true,
      region: { select: regionSelect },
    },
    ...(orderBy ? { orderBy } : {}),
    ...(!isRandom && filters.limit ? { take: filters.limit } : {}),
  });

  let result = villas.map((v) =>
    mapVilla({
      ...v,
      images: [],
      description: "",
      amenities: v.amenities,
      seoTitle: "",
      seoDescription: "",
      seoKeywords: "",
    })!
  );

  const priceRanges = await getVillaPeriodPriceRanges(result.map((v) => v.id));
  result = result.map((villa) => {
    const range = priceRanges.get(villa.id);
    if (!range) return villa;
    return {
      ...villa,
      minNightlyPrice: range.min,
      maxNightlyPrice: range.max,
      pricePerNight: villa.pricePerNight ?? range.min,
    };
  });

  if (filters.checkIn && filters.checkOut) {
    const checkIn = new Date(filters.checkIn);
    const checkOut = new Date(filters.checkOut);
    const availableIds = await getAvailableVillaIds(checkIn, checkOut);
    result = result.filter((v) => availableIds.has(v.id));
  }

  if (filters.adults) {
    result = result.filter((v) => v.guests >= filters.adults!);
  }

  if (isRandom) {
    shuffleInPlace(result);
    if (filters.limit) result = result.slice(0, filters.limit);
  }

  return result;
}

export async function getVillaBySlug(slug: string) {
  const villa = await prisma.villa.findUnique({
    where: { slug },
    include: {
      region: {
        select: regionSelect,
      },
    },
  });
  return mapVilla(villa);
}

export async function getPopularVillas(limit = HOME_SHOWCASE_LIMIT) {
  return getVillas({ filter: "popular", limit });
}

export async function getDealVillas(limit = HOME_SHOWCASE_LIMIT) {
  return getVillas({ filter: "deal", limit });
}

export async function getRecommendedVillas(limit = HOME_SHOWCASE_LIMIT) {
  return getVillas({ filter: "recommended", limit });
}

export async function getVillaCount() {
  return prisma.villa.count();
}

/** Güncel + gelecek dönemlerden villa başına min/max gecelik fiyat */
export async function getVillaPeriodPriceRanges(
  villaIds: string[]
): Promise<Map<string, { min: number; max: number }>> {
  const map = new Map<string, { min: number; max: number }>();
  if (villaIds.length === 0) return map;

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );

  const periods = await prisma.villaPricePeriod.findMany({
    where: {
      villaId: { in: villaIds },
      endDate: { gte: today },
    },
    select: {
      villaId: true,
      nightlyPrice: true,
      discountedNightlyPrice: true,
    },
  });

  for (const period of periods) {
    const price = period.discountedNightlyPrice ?? period.nightlyPrice;
    if (!Number.isFinite(price) || price <= 0) continue;
    const existing = map.get(period.villaId);
    if (!existing) {
      map.set(period.villaId, { min: price, max: price });
    } else {
      existing.min = Math.min(existing.min, price);
      existing.max = Math.max(existing.max, price);
    }
  }

  return map;
}

async function getAvailableVillaIds(checkIn: Date, checkOut: Date) {
  const conflicting = await prisma.booking.findMany({
    where: {
      status: { in: BOOKING_BLOCKING_STATUSES },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    select: { villaId: true },
  });

  const blockedIds = new Set(conflicting.map((b) => b.villaId));
  const allVillas = await prisma.villa.findMany({ select: { id: true } });
  return new Set(allVillas.filter((v) => !blockedIds.has(v.id)).map((v) => v.id));
}

export async function getSearchCategoryOptions() {
  const groups = await prisma.villa.groupBy({
    by: ["category"],
    where: { active: true },
    _count: { _all: true },
  });

  const countByCategory = new Map(
    groups.map((row) => [row.category, row._count._all])
  );

  return facilityTypeOptions.map((option) => ({
    value: option.value,
    label: option.label,
    count: countByCategory.get(option.value) ?? 0,
  }));
}

/** Admin panelindeki Ev Kategorileri — arama filtresi için alfabetik. */
export async function getSearchFacilityCategoryOptions() {
  const [categories, villas] = await Promise.all([
    prisma.facilityCategory.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.villa.findMany({
      where: { active: true },
      select: { facilityCategories: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const villa of villas) {
    for (const name of villa.facilityCategories) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return categories
    .map((category) => ({
      name: category.name,
      count: counts.get(category.name) ?? 0,
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
    );
}
