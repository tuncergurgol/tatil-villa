import type { VillaDayOccupancy } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  buildDaySnapshotsForPeriod,
} from "@/lib/tatildeyiz-period-import";
import {
  applyPeriodMetaFallback,
  buildPeriodMetaFallbackFromPeriods,
  scrapeExternalVillaPage,
  type ScrapedVillaPage,
} from "@/lib/external-villa-page-scrape";
import { dateKeyToDbDate, dbDateToDateKey } from "@/lib/villa-period-calendar";
import { persistVillaPricePeriods } from "@/lib/villa-period-persist";
import type { VillaPeriodImportResult } from "@/lib/tatildeyiz-period-import-runner";
import { loadConfirmedBookingProtectedDateKeys } from "@/lib/confirmed-booking-occupancy-guard";
import { reapplyConfirmedBookingReservedOccupancy } from "@/lib/villa-occupancy-service";
import type { ExternalLinkSyncMode } from "@/lib/external-link-sync-mode";

export function scrapedPageHasReliablePeriods(scraped: ScrapedVillaPage): boolean {
  return scraped.periods.length > 0;
}

export function scrapedPageIsOccupancyOnly(scraped: ScrapedVillaPage): boolean {
  return scraped.periods.length === 0 && scraped.occupancyByDateKey.size > 0;
}

export function scoreScrapedPageForPeriodImport(scraped: ScrapedVillaPage): number {
  if (scraped.periods.length === 0) return -1;
  const unreliable = scraped.warnings.some(
    (warning) =>
      warning.includes("schema.org fiyatından yedek") ||
      warning.includes("tahmini periyot")
  );
  if (unreliable) return scraped.periods.length;
  return scraped.periods.length * 100;
}

function countOccupancyFromMap(occupancyByDateKey: Map<string, VillaDayOccupancy>) {
  let bookedDays = 0;
  let optionDays = 0;
  for (const status of occupancyByDateKey.values()) {
    if (status === "BOOKED") bookedDays += 1;
    if (status === "OPTION") optionDays += 1;
  }
  return {
    dayCount: occupancyByDateKey.size,
    bookedDays,
    optionDays,
  };
}

/** Mevcut fiyat periyotlarını koruyarak harici takvim doluluğunu üzerine yazar. */
export async function applyExternalPageOccupancyOverlay(
  villaId: string,
  occupancyByDateKey: Map<string, VillaDayOccupancy>
): Promise<{ updatedDays: number }> {
  const protectedDateKeys =
    await loadConfirmedBookingProtectedDateKeys(villaId);
  const updates = [];

  for (const [dateKey, occupancyStatus] of occupancyByDateKey) {
    if (occupancyStatus !== "BOOKED" && occupancyStatus !== "OPTION") continue;
    if (protectedDateKeys.has(dateKey)) continue;
    updates.push(
      prisma.villaPricePeriodDay.updateMany({
        where: {
          villaId,
          date: dateKeyToDbDate(dateKey),
        },
        data: { occupancyStatus },
      })
    );
  }

  if (updates.length === 0) {
    return { updatedDays: 0 };
  }

  const results = await prisma.$transaction(updates);
  const updatedDays = results.reduce((sum, item) => sum + item.count, 0);
  return { updatedDays };
}

export type ExternalVillaPageImportResult = VillaPeriodImportResult & {
  strategy: ScrapedVillaPage["strategy"];
  sourceHost: string;
  warnings: string[];
};

function countOccupancyDays(scraped: ScrapedVillaPage) {
  let dayCount = 0;
  let bookedDays = 0;
  let optionDays = 0;

  for (const period of scraped.periods) {
    const snapshots = buildDaySnapshotsForPeriod(
      period,
      scraped.occupancyByDateKey
    );
    dayCount += snapshots.length;
    for (const item of snapshots) {
      if (item.snapshot.occupancyStatus === "BOOKED") bookedDays += 1;
      if (item.snapshot.occupancyStatus === "OPTION") optionDays += 1;
    }
  }

  return { dayCount, bookedDays, optionDays };
}

async function loadExistingOccupancyByDateKey(
  villaId: string
): Promise<Map<string, VillaDayOccupancy>> {
  const days = await prisma.villaPricePeriodDay.findMany({
    where: { villaId },
    select: { date: true, occupancyStatus: true },
  });
  const map = new Map<string, VillaDayOccupancy>();
  for (const day of days) {
    map.set(dbDateToDateKey(day.date), day.occupancyStatus);
  }
  return map;
}

/**
 * Public villa sayfasından fiyat / takvim aktarır.
 * syncMode: calendar_and_price | calendar | price
 */
export async function importVillaPeriodsFromExternalPage(
  villaId: string,
  pageUrl: string,
  options?: { dryRun?: boolean; syncMode?: ExternalLinkSyncMode }
): Promise<ExternalVillaPageImportResult> {
  const dryRun = options?.dryRun ?? false;
  const syncMode = options?.syncMode ?? "calendar_and_price";

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true },
  });
  if (!villa) {
    throw new Error("Villa bulunamadı");
  }

  const existingPeriods = await prisma.villaPricePeriod.findMany({
    where: { villaId },
    select: {
      prepaymentRate: true,
      commissionRate: true,
      cleaningDayCount: true,
      cleaningFee: true,
      cleaningFeeCurrency: true,
      damageDeposit: true,
      damageDepositCurrency: true,
    },
  });

  const scraped = await scrapeExternalVillaPage(pageUrl);

  if (syncMode === "calendar") {
    if (scraped.occupancyByDateKey.size === 0) {
      throw new Error("Sayfadan takvim müsaitliği bulunamadı");
    }
    const { dayCount, bookedDays, optionDays } = countOccupancyFromMap(
      scraped.occupancyByDateKey
    );
    if (dryRun) {
      return {
        periodCount: 0,
        dayCount,
        bookedDays,
        optionDays,
        strategy: scraped.strategy,
        sourceHost: scraped.sourceHost,
        warnings: scraped.warnings,
      };
    }
    const { updatedDays } = await applyExternalPageOccupancyOverlay(
      villaId,
      scraped.occupancyByDateKey
    );
    await reapplyConfirmedBookingReservedOccupancy(villaId);
    return {
      periodCount: 0,
      dayCount: updatedDays,
      bookedDays,
      optionDays,
      strategy: scraped.strategy,
      sourceHost: scraped.sourceHost,
      warnings: scraped.warnings,
    };
  }

  if (syncMode === "price") {
    if (!scrapedPageHasReliablePeriods(scraped)) {
      throw new Error("Sayfadan fiyat periyodu bulunamadı");
    }
    const existingFallback = buildPeriodMetaFallbackFromPeriods(existingPeriods);
    applyPeriodMetaFallback(scraped.periods, existingFallback);
    const existingOccupancy = await loadExistingOccupancyByDateKey(villaId);
    const dayCount = scraped.periods.reduce((sum, period) => {
      return sum + buildDaySnapshotsForPeriod(period, existingOccupancy).length;
    }, 0);
    if (dryRun) {
      return {
        periodCount: scraped.periods.length,
        dayCount,
        bookedDays: 0,
        optionDays: 0,
        strategy: scraped.strategy,
        sourceHost: scraped.sourceHost,
        warnings: scraped.warnings,
      };
    }
    await persistVillaPricePeriods({
      villaId,
      periods: scraped.periods,
      occupancyByDateKey: existingOccupancy,
    });
    await reapplyConfirmedBookingReservedOccupancy(villaId);
    return {
      periodCount: scraped.periods.length,
      dayCount,
      bookedDays: 0,
      optionDays: 0,
      strategy: scraped.strategy,
      sourceHost: scraped.sourceHost,
      warnings: scraped.warnings,
    };
  }

  if (scrapedPageIsOccupancyOnly(scraped)) {
    const { dayCount, bookedDays, optionDays } = countOccupancyFromMap(
      scraped.occupancyByDateKey
    );

    if (dryRun) {
      return {
        periodCount: 0,
        dayCount,
        bookedDays,
        optionDays,
        strategy: scraped.strategy,
        sourceHost: scraped.sourceHost,
        warnings: scraped.warnings,
      };
    }

    const { updatedDays } = await applyExternalPageOccupancyOverlay(
      villaId,
      scraped.occupancyByDateKey
    );
    await reapplyConfirmedBookingReservedOccupancy(villaId);

    return {
      periodCount: 0,
      dayCount: updatedDays,
      bookedDays,
      optionDays,
      strategy: scraped.strategy,
      sourceHost: scraped.sourceHost,
      warnings: scraped.warnings,
    };
  }

  if (!scrapedPageHasReliablePeriods(scraped)) {
    throw new Error("Sayfadan fiyat periyodu bulunamadı");
  }

  const existingFallback = buildPeriodMetaFallbackFromPeriods(existingPeriods);
  applyPeriodMetaFallback(scraped.periods, existingFallback);

  const { dayCount, bookedDays, optionDays } = countOccupancyDays(scraped);

  if (dryRun) {
    return {
      periodCount: scraped.periods.length,
      dayCount,
      bookedDays,
      optionDays,
      strategy: scraped.strategy,
      sourceHost: scraped.sourceHost,
      warnings: scraped.warnings,
    };
  }

  await persistVillaPricePeriods({
    villaId,
    periods: scraped.periods,
    occupancyByDateKey: scraped.occupancyByDateKey,
  });
  await reapplyConfirmedBookingReservedOccupancy(villaId);

  return {
    periodCount: scraped.periods.length,
    dayCount,
    bookedDays,
    optionDays,
    strategy: scraped.strategy,
    sourceHost: scraped.sourceHost,
    warnings: scraped.warnings,
  };
}

export async function importExternalVillaOccupancyFromPage(
  villaId: string,
  pageUrl: string
): Promise<ExternalVillaPageImportResult> {
  return importVillaPeriodsFromExternalPage(villaId, pageUrl, {
    syncMode: "calendar",
  });
}
