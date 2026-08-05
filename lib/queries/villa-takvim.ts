import { prisma } from "@/lib/db";
import { parseVillaRouteParam } from "@/lib/villa-admin-path";
import { getVillaShowcaseImage, type VillaImageFields } from "@/lib/villa-gallery";
import type { VillaPeriodCurrency } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import type { VillaPricePeriodDayItem } from "@/lib/villa-period-days";
import type { VillaTakvimSearchItem } from "@/lib/villa-takvim-types";
import { getVillaPeriodPageData } from "@/lib/queries/villa-periods";

export type { VillaTakvimSearchItem } from "@/lib/villa-takvim-types";

function resolveDisplayPrice(
  nightlyPrice: number | null,
  discountedNightlyPrice: number | null,
  fallbackPrice: number | null
): number | null {
  const candidates = [discountedNightlyPrice, nightlyPrice, fallbackPrice].filter(
    (value): value is number => value != null && value > 0
  );
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

export async function getVillaTakvimSearchOptions() {
  const [villas, periodStats, futurePriceStats] = await Promise.all([
    prisma.villa.findMany({
      select: {
        id: true,
        villaId: true,
        slug: true,
        name: true,
        originalName: true,
        documentNo: true,
        image: true,
        images: true,
        active: true,
        pricePerNight: true,
        _count: {
          select: { pricePeriods: true },
        },
      },
      orderBy: [{ villaId: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    }),
    prisma.villaPricePeriod.groupBy({
      by: ["villaId"],
      _min: {
        nightlyPrice: true,
        discountedNightlyPrice: true,
      },
    }),
    prisma.$queryRaw<
      Array<{
        villaId: string;
        min_price: number | null;
        max_price: number | null;
      }>
    >(Prisma.sql`
      SELECT
        "villaId",
        MIN(COALESCE(NULLIF("discountedNightlyPrice", 0), "nightlyPrice"))::int AS min_price,
        MAX(COALESCE(NULLIF("discountedNightlyPrice", 0), "nightlyPrice"))::int AS max_price
      FROM "VillaPricePeriodDay"
      WHERE "date" >= CURRENT_DATE
      GROUP BY "villaId"
    `),
  ]);

  const futurePriceByVillaId = new Map(
    futurePriceStats.map((item) => [
      item.villaId,
      {
        minFuturePrice: item.min_price,
        maxFuturePrice: item.max_price,
      },
    ])
  );

  const priceByVillaId = new Map(
    periodStats.map((item) => [
      item.villaId,
      {
        nightlyPrice: item._min.nightlyPrice,
        discountedNightlyPrice: item._min.discountedNightlyPrice,
      },
    ])
  );

  return villas.map((villa) =>
    mapVillaToTakvimSearchItem(
      { ...villa, image: villa.image ?? "" },
      priceByVillaId,
      futurePriceByVillaId
    )
  );
}

function mapVillaToTakvimSearchItem(
  villa: VillaImageFields & {
    id: string;
    villaId: number | null;
    slug: string;
    name: string;
    originalName: string;
    documentNo: string;
    active: boolean;
    pricePerNight: number | null;
    _count?: { pricePeriods: number };
  },
  priceByVillaId: Map<
    string,
    { nightlyPrice: number | null; discountedNightlyPrice: number | null }
  >,
  futurePriceByVillaId: Map<
    string,
    { minFuturePrice: number | null; maxFuturePrice: number | null }
  >
): VillaTakvimSearchItem {
  const prices = priceByVillaId.get(villa.id);
  const futurePrices = futurePriceByVillaId.get(villa.id);
  const displayPrice = resolveDisplayPrice(
    prices?.nightlyPrice ?? null,
    prices?.discountedNightlyPrice ?? null,
    villa.pricePerNight
  );

  return {
    id: villa.id,
    villaId: villa.villaId,
    slug: villa.slug,
    name: villa.name,
    originalName: villa.originalName,
    documentNo: villa.documentNo,
    image: getVillaShowcaseImage(villa),
    active: villa.active,
    periodCount: villa._count?.pricePeriods ?? 0,
    displayPrice,
    displayPriceCurrency: "TL" as VillaPeriodCurrency,
    minFuturePrice: futurePrices?.minFuturePrice ?? null,
    maxFuturePrice: futurePrices?.maxFuturePrice ?? null,
  };
}

export async function searchVillaTakvimOptions(
  query: string,
  limit = 12
): Promise<VillaTakvimSearchItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const parsedVillaId = Number.parseInt(trimmed, 10);
  const orFilters: Prisma.VillaWhereInput[] = [
    { name: { contains: trimmed, mode: "insensitive" } },
    { originalName: { contains: trimmed, mode: "insensitive" } },
    { documentNo: { contains: trimmed, mode: "insensitive" } },
    { slug: { contains: trimmed, mode: "insensitive" } },
  ];
  if (Number.isInteger(parsedVillaId) && parsedVillaId > 0) {
    orFilters.push({ villaId: parsedVillaId });
  }

  const villas = await prisma.villa.findMany({
    where: { active: true, OR: orFilters },
    take: limit,
    select: {
      id: true,
      villaId: true,
      slug: true,
      name: true,
      originalName: true,
      documentNo: true,
      image: true,
      images: true,
      active: true,
      pricePerNight: true,
      _count: { select: { pricePeriods: true } },
    },
    orderBy: [{ name: "asc" }],
  });

  if (villas.length === 0) return [];

  const villaIds = villas.map((villa) => villa.id);
  const [periodStats, futurePriceStats] = await Promise.all([
    prisma.villaPricePeriod.groupBy({
      by: ["villaId"],
      where: { villaId: { in: villaIds } },
      _min: { nightlyPrice: true, discountedNightlyPrice: true },
    }),
    prisma.$queryRaw<
      Array<{
        villaId: string;
        min_price: number | null;
        max_price: number | null;
      }>
    >(Prisma.sql`
      SELECT
        "villaId",
        MIN(COALESCE(NULLIF("discountedNightlyPrice", 0), "nightlyPrice"))::int AS min_price,
        MAX(COALESCE(NULLIF("discountedNightlyPrice", 0), "nightlyPrice"))::int AS max_price
      FROM "VillaPricePeriodDay"
      WHERE "date" >= CURRENT_DATE
        AND "villaId" IN (${Prisma.join(villaIds)})
      GROUP BY "villaId"
    `),
  ]);

  const futurePriceByVillaId = new Map(
    futurePriceStats.map((item) => [
      item.villaId,
      {
        minFuturePrice: item.min_price,
        maxFuturePrice: item.max_price,
      },
    ])
  );
  const priceByVillaId = new Map(
    periodStats.map((item) => [
      item.villaId,
      {
        nightlyPrice: item._min.nightlyPrice,
        discountedNightlyPrice: item._min.discountedNightlyPrice,
      },
    ])
  );

  return villas.map((villa) =>
    mapVillaToTakvimSearchItem(
      { ...villa, image: villa.image ?? "" },
      priceByVillaId,
      futurePriceByVillaId
    )
  );
}

async function getVillaTakvimSummary(
  internalId: string,
  periodCount: number
): Promise<VillaTakvimSearchItem | null> {
  const villa = await prisma.villa.findUnique({
    where: { id: internalId },
    select: {
      id: true,
      villaId: true,
      slug: true,
      name: true,
      originalName: true,
      documentNo: true,
      image: true,
      images: true,
      active: true,
      pricePerNight: true,
    },
  });
  if (!villa) return null;

  const [periodMin, futureRows] = await Promise.all([
    prisma.villaPricePeriod.aggregate({
      where: { villaId: internalId },
      _min: { nightlyPrice: true, discountedNightlyPrice: true },
    }),
    prisma.$queryRaw<
      Array<{ min_price: number | null; max_price: number | null }>
    >(Prisma.sql`
      SELECT
        MIN(COALESCE(NULLIF("discountedNightlyPrice", 0), "nightlyPrice"))::int AS min_price,
        MAX(COALESCE(NULLIF("discountedNightlyPrice", 0), "nightlyPrice"))::int AS max_price
      FROM "VillaPricePeriodDay"
      WHERE "date" >= CURRENT_DATE AND "villaId" = ${internalId}
    `),
  ]);

  const future = futureRows[0];
  const priceByVillaId = new Map([
    [
      internalId,
      {
        nightlyPrice: periodMin._min.nightlyPrice,
        discountedNightlyPrice: periodMin._min.discountedNightlyPrice,
      },
    ],
  ]);
  const futurePriceByVillaId = new Map([
    [
      internalId,
      {
        minFuturePrice: future?.min_price ?? null,
        maxFuturePrice: future?.max_price ?? null,
      },
    ],
  ]);

  return {
    ...mapVillaToTakvimSearchItem(
      { ...villa, image: villa.image ?? "", _count: { pricePeriods: periodCount } },
      priceByVillaId,
      futurePriceByVillaId
    ),
  };
}

async function resolveVillaTakvimInternalId(routeParam: string) {
  const parsed = parseVillaRouteParam(routeParam);

  if (parsed.kind === "villaId") {
    const villa = await prisma.villa.findFirst({
      where: { villaId: parsed.value },
      select: { id: true },
    });
    return villa?.id ?? null;
  }

  const villa = await prisma.villa.findUnique({
    where: { id: routeParam },
    select: { id: true },
  });
  return villa?.id ?? null;
}

export type TakvimGridStatus = "all" | "active" | "passive";

export async function getVillaTakvimGridPage({
  page = 1,
  pageSize = 18,
  status = "all",
  q = "",
}: {
  page?: number;
  pageSize?: number;
  status?: TakvimGridStatus;
  q?: string;
}) {
  const trimmed = q.trim();
  const where: Prisma.VillaWhereInput = {};

  if (status === "active") where.active = true;
  if (status === "passive") where.active = false;

  if (trimmed) {
    const parsedVillaId = Number.parseInt(trimmed, 10);
    const orFilters: Prisma.VillaWhereInput[] = [
      { name: { contains: trimmed, mode: "insensitive" } },
      { originalName: { contains: trimmed, mode: "insensitive" } },
      { documentNo: { contains: trimmed, mode: "insensitive" } },
      { slug: { contains: trimmed, mode: "insensitive" } },
    ];
    if (Number.isInteger(parsedVillaId) && parsedVillaId > 0) {
      orFilters.push({ villaId: parsedVillaId });
    }
    where.OR = orFilters;
  }

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(50, Math.max(1, pageSize));

  const [total, villas] = await Promise.all([
    prisma.villa.count({ where }),
    prisma.villa.findMany({
      where,
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
      select: {
        id: true,
        villaId: true,
        slug: true,
        name: true,
        originalName: true,
        documentNo: true,
        image: true,
        images: true,
        active: true,
        pricePerNight: true,
        _count: { select: { pricePeriods: true } },
      },
      orderBy: [{ villaId: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    }),
  ]);

  if (villas.length === 0) {
    return {
      villas: [] as VillaTakvimSearchItem[],
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  const villaIds = villas.map((villa) => villa.id);
  const [periodStats, futurePriceStats] = await Promise.all([
    prisma.villaPricePeriod.groupBy({
      by: ["villaId"],
      where: { villaId: { in: villaIds } },
      _min: { nightlyPrice: true, discountedNightlyPrice: true },
    }),
    prisma.$queryRaw<
      Array<{
        villaId: string;
        min_price: number | null;
        max_price: number | null;
      }>
    >(Prisma.sql`
      SELECT
        "villaId",
        MIN(COALESCE(NULLIF("discountedNightlyPrice", 0), "nightlyPrice"))::int AS min_price,
        MAX(COALESCE(NULLIF("discountedNightlyPrice", 0), "nightlyPrice"))::int AS max_price
      FROM "VillaPricePeriodDay"
      WHERE "date" >= CURRENT_DATE
        AND "villaId" IN (${Prisma.join(villaIds)})
      GROUP BY "villaId"
    `),
  ]);

  const futurePriceByVillaId = new Map(
    futurePriceStats.map((item) => [
      item.villaId,
      {
        minFuturePrice: item.min_price,
        maxFuturePrice: item.max_price,
      },
    ])
  );
  const priceByVillaId = new Map(
    periodStats.map((item) => [
      item.villaId,
      {
        nightlyPrice: item._min.nightlyPrice,
        discountedNightlyPrice: item._min.discountedNightlyPrice,
      },
    ])
  );

  return {
    villas: villas.map((villa) =>
      mapVillaToTakvimSearchItem(
        { ...villa, image: villa.image ?? "" },
        priceByVillaId,
        futurePriceByVillaId
      )
    ),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

export async function getVillaTakvimDetailData(routeParam: string) {
  const internalId = await resolveVillaTakvimInternalId(routeParam);
  if (!internalId) return null;

  const periodData = await getVillaPeriodPageData(internalId);
  if (!periodData) return null;

  const villaSummary = await getVillaTakvimSummary(
    internalId,
    periodData.periods.length
  );
  if (!villaSummary) return null;

  return {
    villa: villaSummary,
    periods: periodData.periods,
    periodDays: periodData.periodDays,
  };
}

export async function getVillaTakvimPageData(routeParam?: string) {
  if (!routeParam) {
    const villas = await getVillaTakvimSearchOptions();
    return { villas, selected: null };
  }

  const selected = await getVillaTakvimDetailData(routeParam);
  if (!selected) {
    return { villas: [], selected: null };
  }

  return { villas: [], selected };
}

export type VillaTakvimSelectedData = {
  villa: VillaTakvimSearchItem;
  periods: VillaPricePeriodItem[];
  periodDays: VillaPricePeriodDayItem[];
} | null;
