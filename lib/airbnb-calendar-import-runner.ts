import { prisma } from "@/lib/db";
import {
  dateKeyToDbDate,
  dbDateToDateKey,
} from "@/lib/villa-period-calendar";
import {
  fetchAirbnbCalendarStays,
  summarizeAirbnbCalendar,
  type AirbnbCalendarStay,
} from "@/lib/airbnb-calendar-scrape";
import { applyVillaPeriodDaysOccupancy } from "@/lib/villa-occupancy-service";
import {
  buildBookedOccupancyForStay,
  enumerateDateKeysInRange,
  normalizeDateRange,
} from "@/lib/villa-period-selection";
import {
  externalIcalSourceName,
  type ExternalSyncSlot,
} from "@/lib/villa-external-sync";

function stayUid(stay: AirbnbCalendarStay): string {
  return `airbnb:${stay.startDateKey}:${stay.endDateKey}`;
}

async function stayOccupancyNeedsApply(
  villaId: string,
  stay: AirbnbCalendarStay
): Promise<boolean> {
  const { start, end } = normalizeDateRange(stay.startDateKey, stay.endDateKey);
  const dateKeys = enumerateDateKeysInRange(start, end);
  if (dateKeys.length === 0) return false;

  const expected = buildBookedOccupancyForStay(stay.startDateKey, stay.endDateKey);
  const rows = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId,
      date: { in: dateKeys.map((dateKey) => dateKeyToDbDate(dateKey)) },
    },
    select: { date: true, occupancyStatus: true },
  });
  const actual = new Map(
    rows.map((row) => [dbDateToDateKey(row.date), row.occupancyStatus])
  );

  for (const dateKey of dateKeys) {
    const want = expected.get(dateKey) ?? "EMPTY";
    const have = actual.get(dateKey) ?? "EMPTY";
    if (want !== have) return true;
  }

  return false;
}

export type AirbnbCalendarImportResult = {
  listingId: string;
  dayCount: number;
  blockedDays: number;
  stayCount: number;
  importedCount: number;
  removedCount: number;
  updatedDays: number;
};

/**
 * Airbnb oda linkinden yalnızca müsaitlik (tarih) aktarır.
 * Mevcut fiyat periyotlarına dokunmaz; giriş–çıkış kuralları iCal ile aynıdır.
 */
export async function importAirbnbCalendarOccupancy(
  villaId: string,
  roomUrl: string,
  slot: ExternalSyncSlot
): Promise<AirbnbCalendarImportResult> {
  const { listingId, days, stays } = await fetchAirbnbCalendarStays(roomUrl);
  const summary = summarizeAirbnbCalendar(days);

  const sourceName = externalIcalSourceName(slot);
  const existing = await prisma.villaIcalSource.findFirst({
    where: { villaId, name: sourceName },
    select: { id: true },
  });

  const source = existing
    ? await prisma.villaIcalSource.update({
        where: { id: existing.id },
        data: { url: roomUrl.trim() },
        select: { id: true },
      })
    : await prisma.villaIcalSource.create({
        data: {
          villaId,
          name: sourceName,
          url: roomUrl.trim(),
          sortOrder: 1000 + slot,
        },
        select: { id: true },
      });

  const importedBlocks = await prisma.villaIcalImportedBlock.findMany({
    where: { sourceId: source.id },
  });

  const existingByUid = new Map(
    importedBlocks.map((block) => [block.externalUid, block])
  );
  const incomingUids = new Set(stays.map((stay) => stayUid(stay)));

  let removedCount = 0;
  let updatedDays = 0;

  for (const block of importedBlocks) {
    if (!block.externalUid.startsWith("airbnb:")) continue;
    if (incomingUids.has(block.externalUid)) continue;

    const result = await applyVillaPeriodDaysOccupancy(
      villaId,
      dbDateToDateKey(block.startDate),
      dbDateToDateKey(block.endDate),
      "EMPTY"
    );
    updatedDays += result.updatedDays;
    await prisma.villaIcalImportedBlock.delete({ where: { id: block.id } });
    removedCount += 1;
  }

  let importedCount = 0;

  for (const stay of stays) {
    const uid = stayUid(stay);
    const existingBlock = existingByUid.get(uid);
    const datesChanged =
      !existingBlock ||
      dbDateToDateKey(existingBlock.startDate) !== stay.startDateKey ||
      dbDateToDateKey(existingBlock.endDate) !== stay.endDateKey;
    const occupancyDrift = await stayOccupancyNeedsApply(villaId, stay);

    if (!datesChanged && !occupancyDrift) continue;

    if (existingBlock && datesChanged) {
      const clearResult = await applyVillaPeriodDaysOccupancy(
        villaId,
        dbDateToDateKey(existingBlock.startDate),
        dbDateToDateKey(existingBlock.endDate),
        "EMPTY"
      );
      updatedDays += clearResult.updatedDays;
    }

    const applyResult = await applyVillaPeriodDaysOccupancy(
      villaId,
      stay.startDateKey,
      stay.endDateKey,
      "BOOKED"
    );
    updatedDays += applyResult.updatedDays;

    await prisma.villaIcalImportedBlock.upsert({
      where: {
        sourceId_externalUid: {
          sourceId: source.id,
          externalUid: uid,
        },
      },
      create: {
        sourceId: source.id,
        villaId,
        externalUid: uid,
        startDate: dateKeyToDbDate(stay.startDateKey),
        endDate: dateKeyToDbDate(stay.endDateKey),
      },
      update: {
        startDate: dateKeyToDbDate(stay.startDateKey),
        endDate: dateKeyToDbDate(stay.endDateKey),
      },
    });

    importedCount += 1;
  }

  const message = `Airbnb ${listingId}: ${summary.stayCount} kapalı dönem, ${summary.blockedDays} dolu gün (${importedCount} güncellendi, ${removedCount} kaldırıldı; ${updatedDays} gün değişti)`;

  await prisma.$transaction([
    prisma.villaIcalSource.update({
      where: { id: source.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "ok",
        lastSyncMessage: message,
      },
    }),
    prisma.villaIcalSyncEvent.create({
      data: {
        villaId,
        message: `Airbnb takvim (${sourceName}): ${message}`,
      },
    }),
  ]);

  return {
    listingId,
    dayCount: summary.dayCount,
    blockedDays: summary.blockedDays,
    stayCount: summary.stayCount,
    importedCount,
    removedCount,
    updatedDays,
  };
}
