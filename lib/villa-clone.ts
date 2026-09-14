import {
  Prisma,
  VillaDayOccupancy,
  type Villa,
  type VillaPool,
  type VillaPoolPeriod,
  type VillaPricePeriod,
  type VillaPricePeriodDay,
  type VillaRoom,
} from "@prisma/client";
import { allocateNextVillaId } from "@/lib/villa-numeric-id";
import { prisma } from "@/lib/db";
import {
  buildVillaSlugFromName,
  ensureUniqueVillaSlug,
  stripVillaCopyLabelFromName,
} from "@/lib/villa-slug";

function stripCopySuffix(name: string) {
  return name.replace(/\s+Kopyası(\s*\(\d+\))?$/i, "").trim();
}

async function buildUniqueCopyName(baseName: string) {
  const root = stripCopySuffix(baseName) || baseName.trim() || "Villa";
  let candidate = `${root} Kopyası`;
  let suffix = 2;

  while (
    await prisma.villa.findFirst({
      where: { name: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${root} Kopyası (${suffix})`;
    suffix += 1;
  }

  return candidate;
}

async function buildUniqueSlug(name: string, excludeVillaId?: string) {
  const baseSlug = buildVillaSlugFromName(stripVillaCopyLabelFromName(name));
  return ensureUniqueVillaSlug(baseSlug, excludeVillaId);
}

function villaScalarsForClone(
  source: Villa,
  name: string,
  slug: string,
  villaId: number
): Prisma.VillaCreateInput {
  return {
    villaId,
    slug,
    name,
    category: source.category,
    region: { connect: { id: source.regionId } },
    owner: source.ownerId ? { connect: { id: source.ownerId } } : undefined,
    location: source.location,
    guests: source.guests,
    livingRooms: source.livingRooms,
    bedrooms: source.bedrooms,
    bathrooms: source.bathrooms,
    pricePerNight: source.pricePerNight,
    image: source.image,
    images: [...source.images],
    description: source.description,
    amenities: [...source.amenities],
    facilityCategories: [...source.facilityCategories],
    active: source.active,
    originalName: source.originalName,
    extraCapacity: source.extraCapacity,
    salesType: source.salesType,
    kbsReportable: source.kbsReportable,
    onlinePayment: source.onlinePayment,
    b2bSharing: source.b2bSharing,
    showInSearch: source.showInSearch,
    showInOffer: source.showInOffer,
    allowPrepaymentOption: source.allowPrepaymentOption,
    allowFullPaymentOption: source.allowFullPaymentOption,
    prepaymentPaymentType: source.prepaymentPaymentTypeId
      ? { connect: { id: source.prepaymentPaymentTypeId } }
      : undefined,
    ribbonText1: source.ribbonText1,
    ribbonText2: source.ribbonText2,
    seoTitle: source.seoTitle,
    seoDescription: source.seoDescription,
    seoKeywords: source.seoKeywords,
    documentNo: source.documentNo,
    documentType: source.documentType,
    documentOwnerName: source.documentOwnerName,
    documentAddress: source.documentAddress,
    documentRoomCapacity: source.documentRoomCapacity,
    documentBedCapacity: source.documentBedCapacity,
    documentImageUrl: source.documentImageUrl,
    featured: source.featured,
    popular: source.popular,
    deal: source.deal,
    recommended: source.recommended,
    dealSortOrder: source.dealSortOrder,
    popularSortOrder: source.popularSortOrder,
    recommendedSortOrder: source.recommendedSortOrder,
    priceInclusionIds: [...source.priceInclusionIds],
    greeterName: source.greeterName,
    greeterPhone: source.greeterPhone,
    calendarManagerName: source.calendarManagerName,
    calendarManagerPhone: source.calendarManagerPhone,
    checkInTime: source.checkInTime,
    checkOutTime: source.checkOutTime,
    allowBaby: source.allowBaby,
    allowChildren: source.allowChildren,
    allowEvents: source.allowEvents,
    allowSmoking: source.allowSmoking,
    allowPets: source.allowPets,
    showNaturePestNotice: source.showNaturePestNotice,
    customRules: [...source.customRules],
    latitude: source.latitude,
    longitude: source.longitude,
    videoUrl: source.videoUrl,
    whatsappGroupId: "",
    whatsappGroupDifferentName: source.whatsappGroupDifferentName,
    externalSyncUrl1: "",
    externalSyncUrl2: "",
    externalSyncUrl3: "",
    externalSyncUrl4: "",
    externalSyncLastSyncedAt1: null,
    externalSyncLastSyncedAt2: null,
    externalSyncLastSyncedAt3: null,
    externalSyncLastSyncedAt4: null,
    externalSyncLastMessage1: "",
    externalSyncLastMessage2: "",
    externalSyncLastMessage3: "",
    externalSyncLastMessage4: "",
  };
}

function periodScalars(
  period: VillaPricePeriod & { days?: VillaPricePeriodDay[] }
): Omit<Prisma.VillaPricePeriodCreateWithoutVillaInput, "days"> {
  const {
    id: _id,
    villaId: _villaId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    days: _days,
    ...data
  } = period;
  return data;
}

function periodDayScalars(
  day: VillaPricePeriodDay
): Omit<
  Prisma.VillaPricePeriodDayCreateWithoutVillaInput,
  "period"
> {
  const {
    id: _id,
    periodId: _periodId,
    villaId: _villaId,
    occupancyStatus: _occupancyStatus,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...data
  } = day;
  return {
    ...data,
    occupancyStatus: VillaDayOccupancy.EMPTY,
  };
}

function roomScalars(
  room: VillaRoom
): Prisma.VillaRoomCreateWithoutVillaInput {
  const {
    id: _id,
    villaId: _villaId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...data
  } = room;
  return data;
}

function poolScalars(
  pool: VillaPool & { periods?: VillaPoolPeriod[] }
): Prisma.VillaPoolCreateWithoutVillaInput {
  const {
    id: _id,
    villaId: _villaId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    periods: _periods,
    ...data
  } = pool;
  return data;
}

function poolPeriodScalars(
  period: VillaPoolPeriod
): Prisma.VillaPoolPeriodCreateWithoutPoolInput {
  const {
    id: _id,
    poolId: _poolId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...data
  } = period;
  return data;
}

export async function cloneVilla(sourceId: string) {
  const source = await prisma.villa.findUnique({
    where: { id: sourceId },
    include: {
      rooms: { orderBy: { sortOrder: "asc" } },
      pools: {
        orderBy: { sortOrder: "asc" },
        include: { periods: { orderBy: { startDate: "asc" } } },
      },
      surroundingDistances: true,
      pricePeriods: {
        orderBy: { startDate: "asc" },
        include: { days: { orderBy: { date: "asc" } } },
      },
    },
  });

  if (!source) {
    throw new Error("Villa bulunamadı");
  }

  const copyName = await buildUniqueCopyName(source.name);
  const slug = await buildUniqueSlug(copyName);

  const created = await prisma.$transaction(async (tx) => {
    const nextVillaId = await allocateNextVillaId(tx);
    const villa = await tx.villa.create({
      data: villaScalarsForClone(source, copyName, slug, nextVillaId),
    });

    if (source.rooms.length > 0) {
      await tx.villaRoom.createMany({
        data: source.rooms.map((room) => ({
          ...roomScalars(room),
          villaId: villa.id,
        })),
      });
    }

    for (const pool of source.pools) {
      const createdPool = await tx.villaPool.create({
        data: {
          ...poolScalars(pool),
          villa: { connect: { id: villa.id } },
        },
      });

      if (pool.periods.length > 0) {
        await tx.villaPoolPeriod.createMany({
          data: pool.periods.map((period) => ({
            ...poolPeriodScalars(period),
            poolId: createdPool.id,
          })),
        });
      }
    }

    if (source.surroundingDistances.length > 0) {
      await tx.villaSurroundingDistance.createMany({
        data: source.surroundingDistances.map((row) => ({
          villaId: villa.id,
          surroundingLocationId: row.surroundingLocationId,
          distanceKm: row.distanceKm,
        })),
      });
    }

    for (const period of source.pricePeriods) {
      const createdPeriod = await tx.villaPricePeriod.create({
        data: {
          ...periodScalars(period),
          villa: { connect: { id: villa.id } },
        },
      });

      if (period.days.length > 0) {
        await tx.villaPricePeriodDay.createMany({
          data: period.days.map((day) => ({
            ...periodDayScalars(day),
            villaId: villa.id,
            periodId: createdPeriod.id,
          })),
        });
      }
    }

    return villa;
  });

  return created;
}
