import type { VillaCategory, VillaDayOccupancy } from "@prisma/client";
import { Prisma } from "@prisma/client";
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
import { isOccupancyNightBlocked } from "@/lib/booking-calendar-selection";
import { offsetDateKey } from "@/lib/villa-period-selection";
import { convertCurrencyAmount } from "@/lib/currency-conversion";
import { getPublicExchangeRates } from "@/lib/exchange-rates";
import { VILLA_SEARCH_PAGE_SIZE } from "@/lib/villa-search-params";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import { resolvePublicSiteVillaFilter } from "@/lib/public-villa-site-filter";

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
  page?: number;
  pageSize?: number;
  limit?: number;
  siteKey?: PublicSiteKey;
  /** VillaPricePeriod içinde bu yıl için fiyatı olan villalar */
  priceYear?: number;
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
  if (sort === "price_asc" || sort === "price_desc" || sort === "guests") {
    return undefined;
  }
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

function villaSortPrice(villa: {
  minNightlyPrice: number | null;
  pricePerNight: number | null;
  stayTotal?: number | null;
}) {
  if (villa.stayTotal != null) return villa.stayTotal;
  return villa.minNightlyPrice ?? villa.pricePerNight ?? Number.POSITIVE_INFINITY;
}

function applyVillaSearchSort(
  result: NonNullable<ReturnType<typeof mapVilla>>[],
  filters: VillaFilters
) {
  if (filters.ids && filters.ids.length > 0) return result;

  const sort = filters.sort;
  if (sort === "price_asc") {
    result.sort((a, b) => villaSortPrice(a) - villaSortPrice(b));
  } else if (sort === "price_desc") {
    result.sort(
      (a, b) =>
        (villaSortPrice(b) === Number.POSITIVE_INFINITY
          ? 0
          : villaSortPrice(b)) -
        (villaSortPrice(a) === Number.POSITIVE_INFINITY
          ? 0
          : villaSortPrice(a))
    );
  } else if (sort === "guests") {
    result.sort((a, b) => b.guests - a.guests);
  }

  return result;
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
    /** Tarih seçili aramada rezervasyon toplamı (konaklama + temizlik) */
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
  const { villas } = await getVillaSearchResults(filters);
  return villas;
}

export async function getVillaSearchResults(filters: VillaFilters = {}) {
  const isOfferShare = Boolean(filters.ids && filters.ids.length > 0);
  const baseWhere: Prisma.VillaWhereInput = {
    active: true,
    ...(isOfferShare ? { showInOffer: true } : { showInSearch: true }),
  };

  if (isOfferShare) {
    baseWhere.id = { in: filters.ids };
  }

  if (filters.filter === "popular") baseWhere.popular = true;
  if (filters.filter === "deal") baseWhere.deal = true;
  if (filters.filter === "recommended") baseWhere.recommended = true;
  if (
    filters.category === "villa" ||
    filters.category === "apart" ||
    filters.category === "suit_daire"
  ) {
    baseWhere.category = filters.category;
  }
  if (filters.region) {
    const regionIds = await getRegionIdsForFilter(filters.region);
    if (regionIds?.length) {
      baseWhere.regionId = { in: regionIds };
    } else {
      baseWhere.region = { slug: filters.region };
    }
  }

  const query = filters.q?.trim();
  if (query) {
    baseWhere.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { originalName: { contains: query, mode: "insensitive" } },
      { location: { contains: query, mode: "insensitive" } },
    ];
  }

  if (filters.priceYear) {
    const yearStart = new Date(Date.UTC(filters.priceYear, 0, 1));
    const yearEnd = new Date(Date.UTC(filters.priceYear, 11, 31));
    baseWhere.pricePeriods = {
      some: {
        nightlyPrice: { gt: 0 },
        startDate: { lte: yearEnd },
        endDate: { gte: yearStart },
      },
    };
  }

  if (filters.amenities && filters.amenities.length > 0) {
    baseWhere.amenities = { hasEvery: filters.amenities };
  }

  if (filters.facilities && filters.facilities.length > 0) {
    baseWhere.facilityCategories = { hasEvery: filters.facilities };
  }

  if (
    !filters.checkIn &&
    !filters.checkOut &&
    (filters.minPrice != null || filters.maxPrice != null)
  ) {
    baseWhere.pricePerNight = {
      ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
    };
  }

  const where = await resolvePublicSiteVillaFilter(baseWhere, filters.siteKey);

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
          stayTotal: quote.total,
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
  }

  if (filters.adults) {
    result = result.filter((v) => v.guests >= filters.adults!);
  }

  if (filters.ids && filters.ids.length > 0) {
    const order = new Map(filters.ids.map((id, index) => [id, index]));
    result.sort(
      (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0)
    );
  } else {
    applyVillaSearchSort(result, filters);
  }

  const totalCount = result.length;

  if (isRandom) {
    shuffleInPlace(result);
  }

  const page = Math.max(1, filters.page ?? 1);
  const isIdList = Boolean(filters.ids?.length);
  const pageSize = isIdList
    ? Math.max(filters.ids!.length, VILLA_SEARCH_PAGE_SIZE)
    : filters.pageSize ?? VILLA_SEARCH_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  result = result.slice(offset, offset + pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    villas: result,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
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

export async function getPopularVillas(
  limit = HOME_SHOWCASE_LIMIT,
  siteKey?: PublicSiteKey
) {
  return getVillas({ filter: "popular", limit, siteKey });
}

export async function getDealVillas(
  limit = HOME_SHOWCASE_LIMIT,
  siteKey?: PublicSiteKey
) {
  return getVillas({ filter: "deal", limit, siteKey });
}

export async function getRecommendedVillas(
  limit = HOME_SHOWCASE_LIMIT,
  siteKey?: PublicSiteKey
) {
  return getVillas({ filter: "recommended", limit, siteKey });
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

  const [periods, exchangeRates] = await Promise.all([
    prisma.villaPricePeriod.findMany({
      where: {
        villaId: { in: villaIds },
        endDate: { gte: today },
      },
      select: {
        villaId: true,
        nightlyPrice: true,
        discountedNightlyPrice: true,
        nightlyPriceCurrency: true,
      },
    }),
    getPublicExchangeRates(),
  ]);

  for (const period of periods) {
    const price = convertCurrencyAmount(
      period.discountedNightlyPrice ?? period.nightlyPrice,
      period.nightlyPriceCurrency,
      "TL",
      exchangeRates
    );
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
 * Fiyat: seçili gecelerin computeStayQuote toplamı (konaklama + temizlik).
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
    { valid: boolean; nights: number; accommodationTotal: number; total: number }
  >;
}> {
  const availableIds = new Set<string>();
  const quotes = new Map<
    string,
    { valid: boolean; nights: number; accommodationTotal: number; total: number }
  >();

  if (villaIds.length === 0) return { availableIds, quotes };
  if (checkInKey >= checkOutKey) return { availableIds, quotes };

  const nightKeys = getStayNightKeys(checkInKey, checkOutKey);
  if (nightKeys.length === 0) return { availableIds, quotes };

  const calendarDateKeys = Array.from(
    new Set([
      offsetDateKey(checkInKey, -1),
      ...nightKeys,
      checkOutKey,
    ])
  );
  const calendarDates = calendarDateKeys.map((key) => dateKeyToDbDate(key));

  const [periodDays, blockingBookings, exchangeRates] = await Promise.all([
    prisma.villaPricePeriodDay.findMany({
      where: {
        villaId: { in: villaIds },
        date: { in: calendarDates },
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
        occupancyCheckIn: true,
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
    getPublicExchangeRates(),
  ]);

  const daysByVilla = new Map<string, Map<string, StayQuoteDayInput>>();
  for (const day of periodDays) {
    const dateKey = dbDateToDateKey(day.date);
    if (!daysByVilla.has(day.villaId)) {
      daysByVilla.set(day.villaId, new Map());
    }
    daysByVilla
      .get(day.villaId)!
      .set(
        dateKey,
        mapDbPeriodDayToQuoteInput(dateKey, day, exchangeRates)
      );
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
      const occupancyMap = new Map<string, VillaDayOccupancy>();
      const checkInDateKeys = new Set<string>();
      for (const [key, day] of daysByDateKey) {
        occupancyMap.set(key, day.occupancyStatus);
        if (day.occupancyCheckIn) checkInDateKeys.add(key);
      }
      available = nightKeys.every(
        (key) =>
          !isOccupancyNightBlocked(
            occupancyMap,
            key,
            undefined,
            undefined,
            checkInDateKeys
          )
      );
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
      total: quote.total,
    });
  }

  return { availableIds, quotes };
}

export async function getSearchCategoryOptions(siteKey?: PublicSiteKey) {
  const groups = await prisma.villa.groupBy({
    by: ["category"],
    where: await resolvePublicSiteVillaFilter(
      { active: true, showInSearch: true },
      siteKey
    ),
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
export async function getSearchFacilityCategoryOptions(siteKey?: PublicSiteKey) {
  const villaWhere = await resolvePublicSiteVillaFilter(
    { active: true, showInSearch: true },
    siteKey
  );
  const [categories, villas] = await Promise.all([
    prisma.facilityCategory.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.villa.findMany({
      where: villaWhere,
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
