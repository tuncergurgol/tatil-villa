import type { VillaCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BOOKING_BLOCKING_STATUSES } from "@/lib/booking-status";
import { getVillaShowcaseImage } from "@/lib/villa-gallery";
import { getRegionIdsForFilter } from "@/lib/queries/region-tree";
import { formatVillaRegionLabel } from "@/lib/queries/villa-location";
import { facilityTypeOptions } from "@/lib/facility-type";
import {
  computeStayQuote,
  getStayNightKeys,
  type StayQuoteDayInput,
} from "@/lib/stay-quote";
import {
  dateKeyToDbDate,
  dbDateToDateKey,
} from "@/lib/villa-period-calendar";
import { mapDbPeriodDayToQuoteInput } from "@/lib/queries/villa-stay-quote";
import { offsetDateKey } from "@/lib/villa-period-selection";

export interface VillaFilters {
  filter?: string;
  region?: string;
  category?: string;
  facilities?: string[];
  /** Paylaşım / teklif linki: seçili villa id listesi */
  ids?: string[];
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
    /** Tarih seçili aramada konaklama bedeli (gecelik toplam) */
    stayTotal: null as number | null,
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

  if (filters.ids && filters.ids.length > 0) {
    where.id = { in: filters.ids };
  }

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

  if (
    !filters.checkIn &&
    !filters.checkOut &&
    (filters.minPrice != null || filters.maxPrice != null)
  ) {
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
    const checkInKey = filters.checkIn.slice(0, 10);
    const checkOutKey = filters.checkOut.slice(0, 10);
    const stay = await resolvePublicSearchStay(
      result.map((v) => v.id),
      checkInKey,
      checkOutKey
    );

    result = result
      .filter((villa) => stay.availableIds.has(villa.id))
      .map((villa) => {
        const quote = stay.quotes.get(villa.id);
        if (!quote || !quote.valid || quote.nights <= 0) return null;
        return {
          ...villa,
          stayTotal: quote.accommodationTotal,
          pricePerNight: Math.round(
            quote.accommodationTotal / quote.nights
          ),
        };
      })
      .filter((villa): villa is NonNullable<typeof villa> => villa != null);

    if (filters.minPrice != null || filters.maxPrice != null) {
      result = result.filter((villa) => {
        const total = villa.stayTotal;
        if (total == null) return false;
        if (filters.minPrice != null && total < filters.minPrice) return false;
        if (filters.maxPrice != null && total > filters.maxPrice) return false;
        return true;
      });
    }

    if (filters.sort === "price_asc") {
      result.sort(
        (a, b) => (a.stayTotal ?? Number.POSITIVE_INFINITY) - (b.stayTotal ?? Number.POSITIVE_INFINITY)
      );
    } else if (filters.sort === "price_desc") {
      result.sort(
        (a, b) => (b.stayTotal ?? 0) - (a.stayTotal ?? 0)
      );
    }
  }

  if (filters.adults) {
    result = result.filter((v) => v.guests >= filters.adults!);
  }

  if (filters.ids && filters.ids.length > 0) {
    const order = new Map(filters.ids.map((id, index) => [id, index]));
    result.sort(
      (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0)
    );
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

/**
 * Public arama: takvim occupancy (BOOKED/OPTION) + eksik günde Booking fallback.
 * Fiyat: seçili gecelerin computeStayQuote konaklama toplamı.
 * Detay sayfası / isVillaAvailable ile aynı kaynak.
 */
async function resolvePublicSearchStay(
  villaIds: string[],
  checkInKey: string,
  checkOutKey: string
): Promise<{
  availableIds: Set<string>;
  quotes: Map<
    string,
    { valid: boolean; nights: number; accommodationTotal: number }
  >;
}> {
  const availableIds = new Set<string>();
  const quotes = new Map<
    string,
    { valid: boolean; nights: number; accommodationTotal: number }
  >();

  if (villaIds.length === 0) return { availableIds, quotes };
  if (checkInKey >= checkOutKey) return { availableIds, quotes };

  const nightKeys = getStayNightKeys(checkInKey, checkOutKey);
  if (nightKeys.length === 0) return { availableIds, quotes };

  const nightDates = nightKeys.map((key) => dateKeyToDbDate(key));

  const [periodDays, blockingBookings] = await Promise.all([
    prisma.villaPricePeriodDay.findMany({
      where: {
        villaId: { in: villaIds },
        date: { in: nightDates },
      },
      select: {
        villaId: true,
        date: true,
        nightlyPrice: true,
        nightlyPriceWithoutCommission: true,
        discountedNightlyPrice: true,
        nightlyPriceCurrency: true,
        availability: true,
        occupancyStatus: true,
        minStayNights: true,
        prepaymentRate: true,
        cleaningFee: true,
        cleaningFeeCurrency: true,
        cleaningDayCount: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        villaId: { in: villaIds },
        status: { in: BOOKING_BLOCKING_STATUSES },
        checkIn: { lt: dateKeyToDbDate(offsetDateKey(checkOutKey, 1)) },
        checkOut: { gt: dateKeyToDbDate(offsetDateKey(checkInKey, -1)) },
      },
      select: { villaId: true, checkIn: true, checkOut: true },
    }),
  ]);

  const daysByVilla = new Map<string, Map<string, StayQuoteDayInput>>();
  for (const day of periodDays) {
    const dateKey = dbDateToDateKey(day.date);
    if (!daysByVilla.has(day.villaId)) {
      daysByVilla.set(day.villaId, new Map());
    }
    daysByVilla
      .get(day.villaId)!
      .set(dateKey, mapDbPeriodDayToQuoteInput(dateKey, day));
  }

  const bookingsByVilla = new Map<
    string,
    Array<{ checkIn: string; checkOut: string }>
  >();
  for (const booking of blockingBookings) {
    if (!bookingsByVilla.has(booking.villaId)) {
      bookingsByVilla.set(booking.villaId, []);
    }
    bookingsByVilla.get(booking.villaId)!.push({
      checkIn: dbDateToDateKey(booking.checkIn),
      checkOut: dbDateToDateKey(booking.checkOut),
    });
  }

  for (const villaId of villaIds) {
    const daysByDateKey = daysByVilla.get(villaId) ?? new Map();
    const allNightsOnCalendar = nightKeys.every((key) =>
      daysByDateKey.has(key)
    );

    let available = false;
    if (allNightsOnCalendar) {
      available = nightKeys.every((key) => {
        const status = daysByDateKey.get(key)?.occupancyStatus;
        return status !== "BOOKED" && status !== "OPTION";
      });
    } else {
      const bookings = bookingsByVilla.get(villaId) ?? [];
      available = !bookings.some(
        (booking) =>
          checkInKey < booking.checkOut && checkOutKey > booking.checkIn
      );
    }

    if (!available) continue;

    const quote = computeStayQuote(checkInKey, checkOutKey, daysByDateKey);
    if (!quote.valid) continue;

    availableIds.add(villaId);
    quotes.set(villaId, {
      valid: true,
      nights: quote.nights,
      accommodationTotal: quote.accommodationTotal,
    });
  }

  return { availableIds, quotes };
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
