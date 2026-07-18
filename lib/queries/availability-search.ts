import type { VillaDayOccupancy } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BOOKING_BLOCKING_STATUSES } from "@/lib/booking-status";
import { getVillaShowcaseImage } from "@/lib/villa-gallery";
import { getCustomerContactChannelsForPicker } from "@/lib/queries/customer-contact-channels";
import { getAmenityAdminData } from "@/lib/queries/amenities";
import {
  collectDescendantIds,
  getAllRegionNodes,
  getRegionTreeFlat,
} from "@/lib/queries/region-tree";
import { buildRegionTree } from "@/lib/regions-tree";
import {
  addDaysToDateKey,
  dbDateToDateKey,
  getMonthsBetweenDates,
  parseDateKey,
  toDateKey,
} from "@/lib/villa-period-calendar";
import { countNightsBetween } from "@/lib/villa-period-selection";
import {
  computeStayQuote,
  convertStayQuoteDayToTl,
  getStayNightKeys,
  type StayQuote,
  type StayQuoteDayInput,
} from "@/lib/stay-quote";
import type { PublicExchangeRates } from "@/lib/currency-conversion";
import { getPublicExchangeRates } from "@/lib/exchange-rates";
import type { PeriodCalendarDayDisplay } from "@/components/admin/villas/periods/PeriodCalendarGrid";

export type AvailabilitySearchSort = "recommended" | "price_asc";

export type AvailabilitySearchFilters = {
  phone?: string;
  guestName?: string;
  guestEmail?: string;
  contactChannelId?: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  babies?: number;
  budgetMin?: number | null;
  budgetMax?: number | null;
  regionSlugs?: string[];
  amenityNames?: string[];
  guestCounts?: number[];
  flexibleDate?: boolean;
  fillEmptyDates?: boolean;
  sort?: AvailabilitySearchSort;
};

export type AvailabilitySearchCalendarDay = PeriodCalendarDayDisplay & {
  dateKey: string;
};

export type AvailabilitySearchResultItem = {
  id: string;
  villaId: number | null;
  slug: string;
  name: string;
  image: string;
  location: string;
  regionName: string;
  guests: number;
  extraCapacity: number;
  bedrooms: number;
  facilityCategories: string[];
  amenities: string[];
  popular: boolean;
  recommended: boolean;
  startingPrice: number | null;
  minStayNights: number | null;
  checkIn: string;
  checkOut: string;
  quote: StayQuote;
  calendarDays: AvailabilitySearchCalendarDay[];
  calendarMonths: { year: number; month: number }[];
};

export type AvailabilitySearchPageData = {
  regionTree: ReturnType<typeof buildRegionTree>;
  contactChannels: Awaited<ReturnType<typeof getCustomerContactChannelsForPicker>>;
  amenities: { id: string; name: string }[];
};

function isBlockingOccupancy(status: VillaDayOccupancy): boolean {
  return status === "BOOKED";
}

async function resolveRegionIds(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];

  const [nodes, regions] = await Promise.all([
    getAllRegionNodes(),
    prisma.region.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    }),
  ]);

  const ids = new Set<string>();
  for (const region of regions) {
    collectDescendantIds(region.id, nodes).forEach((id) => ids.add(id));
  }
  return Array.from(ids);
}

async function resolveAmenityNames(names: string[]): Promise<string[]> {
  return names.map((name) => name.trim()).filter(Boolean);
}

function compareDateKeys(a: string, b: string): number {
  return parseDateKey(a).getTime() - parseDateKey(b).getTime();
}

function getPartySize(filters: AvailabilitySearchFilters): number {
  return (filters.adults ?? 0) + (filters.children ?? 0) + (filters.babies ?? 0);
}

function mapPeriodDayToQuoteInput(
  dateKey: string,
  day: {
    nightlyPrice: number;
    nightlyPriceWithoutCommission: number | null;
    discountedNightlyPrice: number | null;
    nightlyPriceCurrency: StayQuoteDayInput["nightlyPriceCurrency"];
    availability: StayQuoteDayInput["availability"];
    occupancyStatus: VillaDayOccupancy;
    minStayNights: number | null;
    prepaymentRate: number | null;
    cleaningFee: number | null;
    cleaningFeeCurrency: StayQuoteDayInput["cleaningFeeCurrency"];
    cleaningDayCount?: number | null;
    periodId: string;
  },
  exchangeRates: PublicExchangeRates
): StayQuoteDayInput {
  return convertStayQuoteDayToTl({
    dateKey,
    nightlyPrice: day.nightlyPrice,
    nightlyPriceWithoutCommission: day.nightlyPriceWithoutCommission,
    discountedNightlyPrice: day.discountedNightlyPrice,
    nightlyPriceCurrency: day.nightlyPriceCurrency,
    availability: day.availability,
    occupancyStatus: day.occupancyStatus,
    minStayNights: day.minStayNights,
    prepaymentRate: day.prepaymentRate,
    cleaningFee: day.cleaningFee,
    cleaningFeeCurrency: day.cleaningFeeCurrency,
    cleaningDayCount: day.cleaningDayCount ?? null,
  }, exchangeRates);
}

function isStayAvailable(
  checkIn: string,
  checkOut: string,
  daysByDateKey: ReadonlyMap<string, StayQuoteDayInput>,
  fillEmptyDates: boolean
): boolean {
  const nightKeys = getStayNightKeys(checkIn, checkOut);
  if (nightKeys.length === 0) return false;

  for (const dateKey of nightKeys) {
    const day = daysByDateKey.get(dateKey);
    if (!day) return false;
    if (!fillEmptyDates && day.availability === "closed") return false;
    if (isBlockingOccupancy(day.occupancyStatus)) return false;
  }

  return true;
}

function hasBookingConflict(
  villaId: string,
  checkIn: string,
  checkOut: string,
  blockingBookings: { villaId: string; checkIn: Date; checkOut: Date }[]
): boolean {
  const checkInDate = parseDateKey(checkIn);
  const checkOutDate = parseDateKey(checkOut);

  return blockingBookings.some(
    (booking) =>
      booking.villaId === villaId &&
      booking.checkIn < checkOutDate &&
      booking.checkOut > checkInDate
  );
}

function findConsecutiveStayInWindow(
  windowStart: string,
  windowEnd: string,
  nights: number,
  preferredCheckIn: string,
  villaId: string,
  daysByDateKey: ReadonlyMap<string, StayQuoteDayInput>,
  blockingBookings: { villaId: string; checkIn: Date; checkOut: Date }[]
): { checkIn: string; checkOut: string } | null {
  const candidates: string[] = [];
  let cursor = windowStart;
  const lastCheckIn = addDaysToDateKey(windowEnd, -nights);

  while (compareDateKeys(cursor, lastCheckIn) <= 0) {
    candidates.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }

  candidates.sort(
    (left, right) =>
      Math.abs(compareDateKeys(left, preferredCheckIn)) -
      Math.abs(compareDateKeys(right, preferredCheckIn))
  );

  for (const candidateCheckIn of candidates) {
    const candidateCheckOut = addDaysToDateKey(candidateCheckIn, nights);
    if (
      hasBookingConflict(
        villaId,
        candidateCheckIn,
        candidateCheckOut,
        blockingBookings
      )
    ) {
      continue;
    }
    if (isStayAvailable(candidateCheckIn, candidateCheckOut, daysByDateKey, false)) {
      return { checkIn: candidateCheckIn, checkOut: candidateCheckOut };
    }
  }

  return null;
}

function resolveStayDates(
  filters: AvailabilitySearchFilters,
  nights: number,
  villaId: string,
  daysByDateKey: ReadonlyMap<string, StayQuoteDayInput>,
  blockingBookings: { villaId: string; checkIn: Date; checkOut: Date }[]
): { checkIn: string; checkOut: string } | null {
  const exactAvailable =
    !hasBookingConflict(
      villaId,
      filters.checkIn,
      filters.checkOut,
      blockingBookings
    ) &&
    isStayAvailable(filters.checkIn, filters.checkOut, daysByDateKey, false);

  if (exactAvailable && !filters.flexibleDate && !filters.fillEmptyDates) {
    return { checkIn: filters.checkIn, checkOut: filters.checkOut };
  }

  if (!filters.flexibleDate && !filters.fillEmptyDates) {
    return null;
  }

  const windowStart = filters.flexibleDate
    ? addDaysToDateKey(filters.checkIn, -10)
    : filters.checkIn;
  const windowEnd = filters.flexibleDate
    ? addDaysToDateKey(filters.checkOut, 10)
    : filters.checkOut;

  if (exactAvailable) {
    return { checkIn: filters.checkIn, checkOut: filters.checkOut };
  }

  return findConsecutiveStayInWindow(
    windowStart,
    windowEnd,
    nights,
    filters.checkIn,
    villaId,
    daysByDateKey,
    blockingBookings
  );
}

function getCalendarWindow(checkIn: string) {
  const anchor = parseDateKey(checkIn);
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 2, 0);
  return { start, end };
}

function buildCalendarDays(
  periodDays: {
    date: Date;
    periodId: string;
    nightlyPrice: number;
    discountedNightlyPrice: number | null;
    nightlyPriceCurrency: StayQuoteDayInput["nightlyPriceCurrency"];
    availability: StayQuoteDayInput["availability"];
    occupancyStatus: VillaDayOccupancy;
  }[],
  windowStart: Date,
  windowEnd: Date
): AvailabilitySearchCalendarDay[] {
  const items: AvailabilitySearchCalendarDay[] = [];

  for (const day of periodDays) {
    const dateKey = dbDateToDateKey(new Date(day.date));
    const date = parseDateKey(dateKey);
    if (date < windowStart || date > windowEnd) continue;

    items.push({
      dateKey,
      periodId: day.periodId,
      nightlyPrice: day.nightlyPrice,
      discountedNightlyPrice: day.discountedNightlyPrice,
      nightlyPriceCurrency: day.nightlyPriceCurrency,
      availability: day.availability,
      occupancyStatus: day.occupancyStatus,
    });
  }

  return items;
}

export async function getAvailabilitySearchPageData(): Promise<AvailabilitySearchPageData> {
  const [regionFlat, contactChannels, amenityData] = await Promise.all([
    getRegionTreeFlat(),
    getCustomerContactChannelsForPicker(),
    getAmenityAdminData(),
  ]);

  const amenities = amenityData.categories.flatMap((category) =>
    category.amenities
      .filter((amenity) => amenity.active)
      .map((amenity) => ({ id: amenity.id, name: amenity.name }))
  );

  return {
    regionTree: buildRegionTree(regionFlat.filter((region) => region.active)),
    contactChannels,
    amenities,
  };
}

export async function searchAvailability(
  filters: AvailabilitySearchFilters
): Promise<AvailabilitySearchResultItem[]> {
  const partySize = getPartySize(filters);
  const sort = filters.sort ?? "recommended";

  const regionIds = await resolveRegionIds(filters.regionSlugs ?? []);
  const amenityNames = await resolveAmenityNames(filters.amenityNames ?? []);
  const guestCounts = (filters.guestCounts ?? []).filter((value) => value > 0);

  const where: Record<string, unknown> = {
    active: true,
    showInSearch: true,
  };

  if (regionIds.length > 0) {
    where.regionId = { in: regionIds };
  }

  if (amenityNames.length > 0) {
    where.amenities = { hasEvery: amenityNames };
  }

  const villas = await prisma.villa.findMany({
    where,
    select: {
      id: true,
      villaId: true,
      slug: true,
      name: true,
      image: true,
      images: true,
      location: true,
      guests: true,
      extraCapacity: true,
      bedrooms: true,
      pricePerNight: true,
      facilityCategories: true,
      amenities: true,
      popular: true,
      recommended: true,
      region: { select: { name: true } },
    },
  });

  const capacityFiltered = villas.filter((villa) => {
    const totalCapacity = villa.guests + villa.extraCapacity;
    if (partySize > 0 && partySize > totalCapacity) return false;
    if (guestCounts.length === 0) return true;
    return guestCounts.some((count) => totalCapacity >= count);
  });

  if (!filters.checkIn || !filters.checkOut) {
    return [];
  }

  const requestedNights = countNightsBetween(filters.checkIn, filters.checkOut);
  if (requestedNights <= 0) return [];

  const flexibleWindowStart = filters.flexibleDate
    ? addDaysToDateKey(filters.checkIn, -10)
    : filters.checkIn;
  const flexibleWindowEnd = filters.flexibleDate
    ? addDaysToDateKey(filters.checkOut, 10)
    : filters.checkOut;

  const villaIds = capacityFiltered.map((villa) => villa.id);

  if (villaIds.length === 0) return [];

  const [periodDays, blockingBookings, exchangeRates] = await Promise.all([
    prisma.villaPricePeriodDay.findMany({
      where: {
        villaId: { in: villaIds },
        date: {
          gte: new Date(`${flexibleWindowStart}T00:00:00.000Z`),
          lte: new Date(`${flexibleWindowEnd}T00:00:00.000Z`),
        },
      },
      select: {
        villaId: true,
        periodId: true,
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
        checkIn: { lt: new Date(`${flexibleWindowEnd}T00:00:00.000Z`) },
        checkOut: { gt: new Date(`${flexibleWindowStart}T00:00:00.000Z`) },
      },
      select: {
        villaId: true,
        checkIn: true,
        checkOut: true,
      },
    }),
    getPublicExchangeRates(),
  ]);

  const daysByVilla = new Map<string, Map<string, StayQuoteDayInput>>();
  const rawDaysByVilla = new Map<
    string,
    {
      date: Date;
      periodId: string;
      nightlyPrice: number;
      discountedNightlyPrice: number | null;
      nightlyPriceCurrency: StayQuoteDayInput["nightlyPriceCurrency"];
      availability: StayQuoteDayInput["availability"];
      occupancyStatus: VillaDayOccupancy;
    }[]
  >();

  for (const day of periodDays) {
    const dateKey = dbDateToDateKey(new Date(day.date));

    if (!daysByVilla.has(day.villaId)) {
      daysByVilla.set(day.villaId, new Map());
      rawDaysByVilla.set(day.villaId, []);
    }

    const quoteDay = mapPeriodDayToQuoteInput(dateKey, day, exchangeRates);
    daysByVilla.get(day.villaId)!.set(dateKey, quoteDay);
    rawDaysByVilla.get(day.villaId)!.push({
      date: day.date,
      periodId: day.periodId,
      nightlyPrice: day.nightlyPrice,
      discountedNightlyPrice: day.discountedNightlyPrice,
      nightlyPriceCurrency: day.nightlyPriceCurrency,
      availability: day.availability,
      occupancyStatus: day.occupancyStatus,
    });
  }

  const calendarFetchStart = parseDateKey(filters.checkIn);
  const { start: calendarStart, end: calendarEnd } =
    getCalendarWindow(filters.checkIn);

  const calendarPeriodDays = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId: { in: villaIds },
      date: {
        gte: new Date(`${toDateKey(calendarStart)}T00:00:00.000Z`),
        lte: new Date(`${toDateKey(calendarEnd)}T00:00:00.000Z`),
      },
    },
    select: {
      villaId: true,
      periodId: true,
      date: true,
      nightlyPrice: true,
      discountedNightlyPrice: true,
      nightlyPriceCurrency: true,
      availability: true,
      occupancyStatus: true,
    },
  });

  const calendarDaysByVilla = new Map<string, AvailabilitySearchCalendarDay[]>();
  for (const day of calendarPeriodDays) {
    const dateKey = dbDateToDateKey(new Date(day.date));
    const entry: AvailabilitySearchCalendarDay = {
      dateKey,
      periodId: day.periodId,
      nightlyPrice: day.nightlyPrice,
      discountedNightlyPrice: day.discountedNightlyPrice,
      nightlyPriceCurrency: day.nightlyPriceCurrency,
      availability: day.availability,
      occupancyStatus: day.occupancyStatus,
    };

    if (!calendarDaysByVilla.has(day.villaId)) {
      calendarDaysByVilla.set(day.villaId, []);
    }
    calendarDaysByVilla.get(day.villaId)!.push(entry);
  }

  const results: AvailabilitySearchResultItem[] = [];

  for (const villa of capacityFiltered) {
    const villaDays = daysByVilla.get(villa.id) ?? new Map();

    const stay = resolveStayDates(
      filters,
      requestedNights,
      villa.id,
      villaDays,
      blockingBookings
    );
    if (!stay) continue;

    const stayCheckIn = stay.checkIn;
    const stayCheckOut = stay.checkOut;

    const quote = computeStayQuote(stayCheckIn, stayCheckOut, villaDays);
    if (!quote.valid) continue;

    if (filters.budgetMin != null && quote.total < filters.budgetMin) continue;
    if (filters.budgetMax != null && quote.total > filters.budgetMax) continue;

    const calendarDays =
      calendarDaysByVilla.get(villa.id) ??
      buildCalendarDays(
        rawDaysByVilla.get(villa.id) ?? [],
        calendarStart,
        calendarEnd
      );

    const minNightly = [...villaDays.values()].reduce<number | null>(
      (min, day) => {
        const price = day.discountedNightlyPrice ?? day.nightlyPrice;
        if (price <= 0) return min;
        return min == null ? price : Math.min(min, price);
      },
      null
    );

    results.push({
      id: villa.id,
      villaId: villa.villaId,
      slug: villa.slug,
      name: villa.name,
      image: getVillaShowcaseImage(villa),
      location: villa.location,
      regionName: villa.region.name,
      guests: villa.guests,
      extraCapacity: villa.extraCapacity,
      bedrooms: villa.bedrooms,
      facilityCategories: villa.facilityCategories,
      amenities: villa.amenities,
      popular: villa.popular,
      recommended: villa.recommended,
      startingPrice: minNightly ?? villa.pricePerNight,
      minStayNights: quote.minStayNights,
      checkIn: stayCheckIn,
      checkOut: stayCheckOut,
      quote,
      calendarDays,
      calendarMonths: getMonthsBetweenDates(calendarFetchStart, calendarEnd),
    });
  }

  if (sort === "price_asc") {
    results.sort((left, right) => left.quote.total - right.quote.total);
  } else {
    results.sort((left, right) => {
      if (left.recommended !== right.recommended) {
        return left.recommended ? -1 : 1;
      }
      if (left.popular !== right.popular) {
        return left.popular ? -1 : 1;
      }
      return left.name.localeCompare(right.name, "tr");
    });
  }

  return results;
}
