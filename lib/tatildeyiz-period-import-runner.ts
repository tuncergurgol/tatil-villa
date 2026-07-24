import { prisma } from "@/lib/db";
import {
  buildDaySnapshotsForPeriod,
  buildOccupancyByDateKey,
  mapTatildeyizPropertyPeriods,
} from "@/lib/tatildeyiz-period-import";
import { fetchTatildeyizPropertyWithDelay } from "@/lib/tatildeyiz-property";
import {
  assertTatildeyizVillaSource,
  mapTatildeyizFetchError,
} from "@/lib/tatildeyiz-villa-source";
import { persistVillaPricePeriods } from "@/lib/villa-period-persist";

export type VillaPeriodImportResult = {
  periodCount: number;
  dayCount: number;
  bookedDays: number;
  optionDays: number;
};

function countOccupancyDays(
  periods: ReturnType<typeof mapTatildeyizPropertyPeriods>,
  occupancyByDateKey: Map<string, "EMPTY" | "BOOKED" | "OPTION">
) {
  let dayCount = 0;
  let bookedDays = 0;
  let optionDays = 0;

  for (const period of periods) {
    const snapshots = buildDaySnapshotsForPeriod(period, occupancyByDateKey);
    dayCount += snapshots.length;

    for (const item of snapshots) {
      if (item.snapshot.occupancyStatus === "BOOKED") bookedDays += 1;
      if (item.snapshot.occupancyStatus === "OPTION") optionDays += 1;
    }
  }

  return { dayCount, bookedDays, optionDays };
}

/**
 * Tatildeyiz’den fiyat periyotları + müsaitlik günlerini aktarır.
 * Mevcut VillaPricePeriod / VillaPricePeriodDay kayıtlarını silip üzerine yazar.
 */
export async function importVillaPeriodsFromTatildeyiz(
  villaId: string,
  slug: string,
  options?: { dryRun?: boolean }
): Promise<VillaPeriodImportResult> {
  const dryRun = options?.dryRun ?? false;

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true, slug: true, villaId: true },
  });
  if (!villa) {
    throw new Error("Villa bulunamadı");
  }

  assertTatildeyizVillaSource({
    slug: slug || villa.slug,
    villaId: villa.villaId,
  });

  const sourceSlug = (slug || villa.slug).trim();
  let property;
  try {
    property = await fetchTatildeyizPropertyWithDelay(sourceSlug);
  } catch (error) {
    throw mapTatildeyizFetchError(error, sourceSlug);
  }

  const periods = mapTatildeyizPropertyPeriods(property);
  const occupancyByDateKey = buildOccupancyByDateKey(property);
  const { dayCount, bookedDays, optionDays } = countOccupancyDays(
    periods,
    occupancyByDateKey
  );

  if (periods.length === 0) {
    throw new Error("Tatildeyiz'den periyot bulunamadı");
  }

  if (dryRun) {
    return {
      periodCount: periods.length,
      dayCount,
      bookedDays,
      optionDays,
    };
  }

  await persistVillaPricePeriods({
    villaId,
    periods,
    occupancyByDateKey,
  });

  return {
    periodCount: periods.length,
    dayCount,
    bookedDays,
    optionDays,
  };
}
