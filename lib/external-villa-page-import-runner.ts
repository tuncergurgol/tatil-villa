import { prisma } from "@/lib/db";
import {
  buildDaySnapshotsForPeriod,
  mappedPeriodToPeriodData,
} from "@/lib/tatildeyiz-period-import";
import {
  scrapeExternalVillaPage,
  type ScrapedVillaPage,
} from "@/lib/external-villa-page-scrape";
import { dateKeyToDbDate, toDateKey } from "@/lib/villa-period-calendar";
import type { VillaPeriodImportResult } from "@/lib/tatildeyiz-period-import-runner";

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

/**
 * Public villa sayfasından fiyat periyotları + müsaitlik aktarır.
 * Mevcut VillaPricePeriod / VillaPricePeriodDay kayıtlarını silip üzerine yazar
 * (Tatildeyiz period import ile aynı overwrite davranışı).
 */
export async function importVillaPeriodsFromExternalPage(
  villaId: string,
  pageUrl: string,
  options?: { dryRun?: boolean }
): Promise<ExternalVillaPageImportResult> {
  const dryRun = options?.dryRun ?? false;

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true },
  });
  if (!villa) {
    throw new Error("Villa bulunamadı");
  }

  const scraped = await scrapeExternalVillaPage(pageUrl);
  if (scraped.periods.length === 0) {
    throw new Error("Sayfadan fiyat periyodu bulunamadı");
  }

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

  await prisma.$transaction(async (tx) => {
    await tx.villaPricePeriodDay.deleteMany({ where: { villaId } });
    await tx.villaPricePeriod.deleteMany({ where: { villaId } });

    for (const mapped of scraped.periods) {
      const periodData = mappedPeriodToPeriodData(mapped);
      const created = await tx.villaPricePeriod.create({
        data: {
          villaId,
          ...periodData,
          startDate: dateKeyToDbDate(toDateKey(mapped.startDate)),
          endDate: dateKeyToDbDate(toDateKey(mapped.endDate)),
        },
      });

      const snapshots = buildDaySnapshotsForPeriod(
        mapped,
        scraped.occupancyByDateKey
      );
      if (snapshots.length === 0) continue;

      await tx.villaPricePeriodDay.createMany({
        data: snapshots.map(({ dateKey, snapshot }) => ({
          periodId: created.id,
          villaId,
          date: dateKeyToDbDate(dateKey),
          ...snapshot,
          occupancyStatus: snapshot.occupancyStatus ?? "EMPTY",
        })),
        skipDuplicates: true,
      });
    }
  });

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
