import { prisma } from "@/lib/db";
import { getVillaGalleryImages } from "@/lib/villa-gallery";
import { getRoomTypeLabel, formatBedSummary } from "@/lib/villa-room-features";
import { formatVillaRegionLabel } from "@/lib/queries/villa-location";
import { getVillaPeriodPriceRanges } from "@/lib/queries/villas";
import { RegionLevel } from "@/lib/region-levels";
import { dbDateToDateKey } from "@/lib/villa-period-calendar";

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function addMonthsUtc(date: Date, months: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
  );
}

function formatDistanceKm(km: number) {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} Metre`;
  }
  const rounded = Number.isInteger(km) ? km.toFixed(0) : km.toFixed(1);
  return `${rounded} Km`;
}

export async function getVillaDetailBySlug(slug: string) {
  const villa = await prisma.villa.findUnique({
    where: { slug },
    include: {
      region: {
        select: {
          slug: true,
          name: true,
          level: true,
          parent: {
            select: {
              name: true,
              level: true,
              parent: { select: { name: true, level: true } },
            },
          },
        },
      },
      rooms: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      pools: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          periods: {
            orderBy: { startDate: "asc" },
            select: {
              startDate: true,
              endDate: true,
              heatingFee: true,
              heatingFeeCurrency: true,
              poolOpen: true,
            },
          },
        },
      },
      surroundingDistances: {
        include: {
          surroundingLocation: {
            select: {
              name: true,
              category: { select: { name: true, sortOrder: true } },
            },
          },
        },
        orderBy: { distanceKm: "asc" },
      },
      guestReviews: {
        where: { approved: true },
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        take: 20,
      },
      pricePeriods: {
        orderBy: { startDate: "asc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          nightlyPrice: true,
          discountedNightlyPrice: true,
          nightlyPriceCurrency: true,
          minStayNights: true,
          cleaningFee: true,
          cleaningFeeCurrency: true,
          cleaningDayCount: true,
          damageDeposit: true,
          damageDepositCurrency: true,
        },
      },
    },
  });

  if (!villa || !villa.active) return null;

  const fromDate = startOfTodayUtc();
  const toDate = addMonthsUtc(fromDate, 4);
  const priceInclusionIds = villa.priceInclusionIds;

  const [priceInclusions, reviewAgg, amenityRows, calendarDays] =
    await Promise.all([
      priceInclusionIds.length > 0
        ? prisma.priceInclusionItem.findMany({
            where: { id: { in: priceInclusionIds }, active: true },
            orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
            select: { id: true, description: true, type: true },
          })
        : Promise.resolve([]),
      prisma.guestReview.aggregate({
        where: { villaId: villa.id, approved: true },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      villa.amenities.length > 0
        ? prisma.amenity.findMany({
            where: { name: { in: villa.amenities }, active: true },
            select: {
              name: true,
              category: { select: { name: true, sortOrder: true } },
            },
          })
        : Promise.resolve([]),
      prisma.villaPricePeriodDay.findMany({
        where: {
          villaId: villa.id,
          date: { gte: fromDate, lt: toDate },
        },
        orderBy: { date: "asc" },
        select: {
          date: true,
          occupancyStatus: true,
          availability: true,
          nightlyPrice: true,
          nightlyPriceWithoutCommission: true,
          discountedNightlyPrice: true,
          nightlyPriceCurrency: true,
          minStayNights: true,
          prepaymentRate: true,
          cleaningFee: true,
          cleaningFeeCurrency: true,
          cleaningDayCount: true,
          damageDeposit: true,
          petCleaningFee: true,
          petDamageDeposit: true,
          underfloorHeatingFee: true,
          extraBedFee: true,
          poolHeatingPrivateFee: true,
          poolHeatingIndoorFee: true,
          poolHeatingKidsFee: true,
        },
      }),
    ]);

  const images = getVillaGalleryImages(villa);

  const regionParts = [
    villa.region.parent?.parent?.name,
    villa.region.parent?.name,
    villa.region.name,
  ].filter(Boolean) as string[];

  const distancesByCategory = new Map<
    string,
    { name: string; distanceKm: number; distanceLabel: string }[]
  >();
  const categoryOrder = new Map<string, number>();
  for (const row of villa.surroundingDistances) {
    const categoryName = row.surroundingLocation.category.name;
    categoryOrder.set(
      categoryName,
      row.surroundingLocation.category.sortOrder
    );
    const list = distancesByCategory.get(categoryName) ?? [];
    list.push({
      name: row.surroundingLocation.name,
      distanceKm: row.distanceKm,
      distanceLabel: formatDistanceKm(row.distanceKm),
    });
    distancesByCategory.set(categoryName, list);
  }

  const amenityByName = new Map(
    amenityRows.map((row) => [
      row.name,
      { category: row.category.name, sortOrder: row.category.sortOrder },
    ])
  );
  const amenityGroupsMap = new Map<
    string,
    { sortOrder: number; items: string[] }
  >();
  for (const name of villa.amenities) {
    const meta = amenityByName.get(name);
    const category = meta?.category ?? "Diğer";
    const sortOrder = meta?.sortOrder ?? 999;
    const group = amenityGroupsMap.get(category) ?? {
      sortOrder,
      items: [],
    };
    group.items.push(name);
    amenityGroupsMap.set(category, group);
  }
  const amenityGroups = Array.from(amenityGroupsMap.entries())
    .map(([category, value]) => ({
      category,
      items: value.items,
      sortOrder: value.sortOrder,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.category.localeCompare(b.category, "tr"));

  const hasCoords =
    Number.isFinite(villa.latitude) &&
    Number.isFinite(villa.longitude) &&
    !(villa.latitude === 0 && villa.longitude === 0);

  const periods = villa.pricePeriods.map((period) => ({
    id: period.id,
    startDate: period.startDate.toISOString(),
    endDate: period.endDate.toISOString(),
    nightlyPrice: period.discountedNightlyPrice ?? period.nightlyPrice,
    currency: period.nightlyPriceCurrency,
    minStayNights: period.minStayNights,
    cleaningFee: period.cleaningFee,
    cleaningFeeCurrency: period.cleaningFeeCurrency,
    cleaningDayCount: period.cleaningDayCount,
    damageDeposit: period.damageDeposit,
    damageDepositCurrency: period.damageDepositCurrency,
  }));

  const currentDamageDeposit = resolveCurrentDamageDeposit(
    villa.pricePeriods,
    fromDate
  );

  return {
    id: villa.id,
    villaCode: villa.villaId != null ? String(villa.villaId) : "",
    slug: villa.slug,
    name: villa.name,
    category: villa.category,
    location: villa.location,
    regionId: villa.regionId,
    regionLabel: regionParts.join(" - ") || villa.location,
    regionSlug: villa.region.slug,
    guests: villa.guests,
    extraCapacity: villa.extraCapacity,
    bedrooms: villa.bedrooms,
    bathrooms: villa.bathrooms,
    livingRooms: villa.livingRooms,
    pricePerNight: villa.pricePerNight,
    documentNo: villa.documentNo?.trim() || "",
    documentType: villa.documentType,
    images,
    image: images[0] ?? villa.image,
    description: villa.description,
    amenities: villa.amenities,
    amenityGroups,
    facilityCategories: villa.facilityCategories,
    latitude: villa.latitude,
    longitude: villa.longitude,
    hasCoords,
    videoUrl: villa.videoUrl,
    checkInTime: villa.checkInTime,
    checkOutTime: villa.checkOutTime,
    allowBaby: villa.allowBaby,
    allowChildren: villa.allowChildren,
    allowEvents: villa.allowEvents,
    allowSmoking: villa.allowSmoking,
    allowPets: villa.allowPets,
    customRules: villa.customRules,
    seoTitle: villa.seoTitle,
    seoDescription: villa.seoDescription,
    seoKeywords: villa.seoKeywords,
    rooms: villa.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      roomType: room.roomType,
      roomTypeLabel: getRoomTypeLabel(room.roomType),
      bedSummary: formatBedSummary(room.singleBeds, room.doubleBeds),
      singleBeds: room.singleBeds,
      doubleBeds: room.doubleBeds,
      imageUrl: room.imageUrl,
      features: [...room.features, ...room.customFeatures],
    })),
    pools: villa.pools.map((pool) => ({
      id: pool.id,
      poolType: pool.poolType,
      width: pool.width,
      length: pool.length,
      depth: pool.depth,
      measureUnit: pool.measureUnit,
      heated: pool.heated,
      conservative: pool.conservative,
      purificationMethod: pool.purificationMethod,
      periods: pool.periods.map((period) => ({
        startDate: dbDateToDateKey(period.startDate),
        endDate: dbDateToDateKey(period.endDate),
        heatingFee: period.heatingFee,
        heatingFeeCurrency: period.heatingFeeCurrency,
        poolOpen: period.poolOpen,
      })),
    })),
    distances: Array.from(distancesByCategory.entries())
      .map(([category, items]) => ({
        category,
        items,
        sortOrder: categoryOrder.get(category) ?? 999,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.category.localeCompare(b.category, "tr")),
    priceIncluded: priceInclusions.filter((item) => item.type === "INCLUDED"),
    priceExcluded: priceInclusions.filter((item) => item.type === "EXCLUDED"),
    reviews: villa.guestReviews.map((review) => ({
      id: review.id,
      guestName: review.guestName,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      stayMonth: review.stayMonth,
      createdAt: review.createdAt.toISOString(),
    })),
    reviewCount: reviewAgg._count._all,
    averageRating: reviewAgg._avg.rating
      ? Math.round(reviewAgg._avg.rating * 10) / 10
      : null,
    periods,
    currentDamageDeposit,
    calendarDays: calendarDays.map((day) => ({
      date: dbDateToDateKey(day.date),
      occupancyStatus: day.occupancyStatus,
      availability: day.availability,
      nightlyPrice: day.nightlyPrice,
      nightlyPriceWithoutCommission: day.nightlyPriceWithoutCommission,
      discountedNightlyPrice: day.discountedNightlyPrice,
      price: day.discountedNightlyPrice ?? day.nightlyPrice,
      currency: day.nightlyPriceCurrency,
      nightlyPriceCurrency: day.nightlyPriceCurrency,
      minStayNights: day.minStayNights,
      prepaymentRate: day.prepaymentRate,
      cleaningFee: day.cleaningFee,
      cleaningFeeCurrency: day.cleaningFeeCurrency,
      cleaningDayCount: day.cleaningDayCount,
      damageDeposit: day.damageDeposit,
      petCleaningFee: day.petCleaningFee,
      petDamageDeposit: day.petDamageDeposit,
      underfloorHeatingFee: day.underfloorHeatingFee,
      extraBedFee: day.extraBedFee,
      poolHeatingPrivateFee: day.poolHeatingPrivateFee,
      poolHeatingIndoorFee: day.poolHeatingIndoorFee,
      poolHeatingKidsFee: day.poolHeatingKidsFee,
    })),
  };
}

function resolveCurrentDamageDeposit(
  periods: {
    startDate: Date;
    endDate: Date;
    damageDeposit: number | null;
    damageDepositCurrency: string;
  }[],
  today: Date
) {
  const withDeposit = periods.filter(
    (period) => period.damageDeposit != null && period.damageDeposit > 0
  );
  if (withDeposit.length === 0) return null;

  const current = withDeposit.find(
    (period) => period.startDate <= today && today <= period.endDate
  );
  if (current) {
    return {
      amount: current.damageDeposit as number,
      currency: current.damageDepositCurrency,
    };
  }

  const upcoming = withDeposit
    .filter((period) => period.startDate > today)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
  if (upcoming) {
    return {
      amount: upcoming.damageDeposit as number,
      currency: upcoming.damageDepositCurrency,
    };
  }

  const past = withDeposit
    .filter((period) => period.endDate < today)
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0];
  if (!past) return null;

  return {
    amount: past.damageDeposit as number,
    currency: past.damageDepositCurrency,
  };
}

export type VillaDetail = NonNullable<
  Awaited<ReturnType<typeof getVillaDetailBySlug>>
>;

export type SimilarVillaCard = {
  id: string;
  slug: string;
  name: string;
  category: VillaDetail["category"];
  region: string;
  regionName?: string;
  location: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  pricePerNight: number | null;
  minNightlyPrice?: number | null;
  maxNightlyPrice?: number | null;
  image: string;
  images: string[];
  description: string;
  amenities: string[];
  featured: boolean;
  popular: boolean;
  deal: boolean;
  recommended: boolean;
};

const SIMILAR_VILLA_SELECT = {
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
  images: true,
  description: true,
  amenities: true,
  featured: true,
  popular: true,
  deal: true,
  recommended: true,
  regionId: true,
  region: {
    select: {
      slug: true,
      name: true,
      parent: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
    },
  },
} as const;

async function buildRegionChildrenMap() {
  const regions = await prisma.region.findMany({
    where: { active: true },
    select: { id: true, parentId: true },
  });
  const childrenByParent = new Map<string, string[]>();
  for (const region of regions) {
    if (!region.parentId) continue;
    const list = childrenByParent.get(region.parentId) ?? [];
    list.push(region.id);
    childrenByParent.set(region.parentId, list);
  }
  return childrenByParent;
}

function collectDescendantRegionIdsFromMap(
  rootId: string,
  childrenByParent: Map<string, string[]>
): string[] {
  const ids: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    ids.push(current);
    const children = childrenByParent.get(current) ?? [];
    stack.push(...children);
  }
  return ids;
}

async function resolveSimilarRegionTiers(regionId: string): Promise<string[][]> {
  const region = await prisma.region.findUnique({
    where: { id: regionId },
    select: {
      id: true,
      level: true,
      parentId: true,
      parent: {
        select: {
          id: true,
          level: true,
          parentId: true,
          parent: { select: { id: true, level: true } },
        },
      },
    },
  });

  if (!region) return [[regionId]];

  const childrenByParent = await buildRegionChildrenMap();
  const treeOf = (id: string) =>
    collectDescendantRegionIdsFromMap(id, childrenByParent);

  if (region.level === RegionLevel.MAHALLE) {
    const mahalleId = region.id;
    const ilceId = region.parentId;
    const ilId =
      region.parent?.level === RegionLevel.ILCE
        ? region.parent.parentId
        : region.parent?.level === RegionLevel.IL
          ? region.parent.id
          : null;

    const ilceTree = ilceId ? treeOf(ilceId) : [mahalleId];
    const ilTree = ilId ? treeOf(ilId) : ilceTree;

    return [
      [mahalleId],
      Array.from(new Set(ilceTree)),
      Array.from(new Set(ilTree)),
    ];
  }

  if (region.level === RegionLevel.ILCE) {
    const ilceTree = treeOf(region.id);
    const ilId = region.parentId;
    const ilTree = ilId ? treeOf(ilId) : ilceTree;

    return [
      Array.from(new Set(ilceTree)),
      Array.from(new Set(ilTree)),
      Array.from(new Set(ilTree)),
    ];
  }

  const ilTree = treeOf(region.id);
  return [ilTree, ilTree, ilTree];
}

function guestCapacityTargets(guests: number) {
  const base = Math.max(1, guests);
  return [base, base + 1, base + 2];
}

export async function getSimilarVillas(
  villaId: string,
  regionId: string,
  guests: number,
  limit = 10
): Promise<SimilarVillaCard[]> {
  const tiers = await resolveSimilarRegionTiers(regionId);
  const guestTargets = guestCapacityTargets(guests);
  const rowsDraft: Array<{
    id: string;
    slug: string;
    name: string;
    category: VillaDetail["category"];
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
    region: {
      slug: string;
      name: string;
      parent: {
        name: string;
        parent: { name: string } | null;
      } | null;
    };
  }> = [];
  const seen = new Set<string>([villaId]);

  for (const regionIds of tiers) {
    if (rowsDraft.length >= limit) break;

    const remaining = limit - rowsDraft.length;
    const rows = await prisma.villa.findMany({
      where: {
        active: true,
        id: { notIn: Array.from(seen) },
        regionId: { in: regionIds },
        guests: { in: guestTargets },
      },
      orderBy: [{ popular: "desc" }, { updatedAt: "desc" }],
      take: Math.max(remaining * 3, remaining),
      select: SIMILAR_VILLA_SELECT,
    });

    const ranked = [...rows].sort((a, b) => {
      const guestDiff =
        guestTargets.indexOf(a.guests) - guestTargets.indexOf(b.guests);
      if (guestDiff !== 0) return guestDiff;
      if (a.popular !== b.popular) return Number(b.popular) - Number(a.popular);
      return 0;
    });

    for (const row of ranked) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rowsDraft.push(row);
      if (rowsDraft.length >= limit) break;
    }
  }

  const priceRanges = await getVillaPeriodPriceRanges(
    rowsDraft.map((row) => row.id)
  );

  return rowsDraft.map((row) => {
    const regionLabel = formatVillaRegionLabel(row.region);
    const range = priceRanges.get(row.id);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      region: row.region.slug,
      regionName: row.region.name,
      location: regionLabel || row.location,
      guests: row.guests,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      pricePerNight: row.pricePerNight ?? range?.min ?? null,
      minNightlyPrice: range?.min ?? null,
      maxNightlyPrice: range?.max ?? null,
      image: row.image,
      images: row.images,
      description: row.description,
      amenities: row.amenities,
      featured: row.featured,
      popular: row.popular,
      deal: row.deal,
      recommended: row.recommended,
    };
  });
}
