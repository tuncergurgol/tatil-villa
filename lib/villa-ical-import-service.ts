import ical from "node-ical";
import { prisma } from "@/lib/db";
import {
  dateKeyToDbDate,
  dbDateToDateKey,
  toDateKey,
} from "@/lib/villa-period-calendar";
import { applyVillaPeriodDaysOccupancy } from "@/lib/villa-occupancy-service";
import { offsetDateKey } from "@/lib/villa-period-selection";

export type ParsedIcalEvent = {
  uid: string;
  startDateKey: string;
  endDateKey: string;
  summary: string;
};

const FETCH_TIMEOUT_MS = 30_000;

function isAllDayEvent(value: Date, raw: Record<string, unknown>) {
  if (raw.datetype === "date") return true;
  return (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0
  );
}

function toDateKeyFromIcal(value: Date, allDay: boolean) {
  if (allDay) {
    const year = value.getUTCFullYear();
    const month = value.getUTCMonth() + 1;
    const day = value.getUTCDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return toDateKey(value);
}

export function parseIcalEvents(icalData: string): ParsedIcalEvent[] {
  const parsed = ical.sync.parseICS(icalData);
  const events: ParsedIcalEvent[] = [];

  for (const item of Object.values(parsed)) {
    if (!item || typeof item !== "object") continue;
    const event = item as Record<string, unknown> & {
      type?: string;
      start?: Date;
      end?: Date;
      summary?: string;
      uid?: string;
    };

    if (event.type !== "VEVENT" || !event.start) continue;

    const startAllDay = isAllDayEvent(event.start, event);
    const startDateKey = toDateKeyFromIcal(event.start, startAllDay);

    let endDateKey = startDateKey;
    if (event.end) {
      const endAllDay = isAllDayEvent(event.end, event);
      const rawEndKey = toDateKeyFromIcal(event.end, endAllDay);
      endDateKey =
        startAllDay || endAllDay
          ? offsetDateKey(rawEndKey, -1)
          : rawEndKey;
    }

    if (endDateKey < startDateKey) {
      endDateKey = startDateKey;
    }

    const uid = String(event.uid ?? `${startDateKey}-${endDateKey}-${events.length}`);
    events.push({
      uid,
      startDateKey,
      endDateKey,
      summary: String(event.summary ?? "").trim(),
    });
  }

  return events;
}

async function fetchIcalUrl(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TatilVilla-iCalSync/1.0",
        Accept: "text/calendar, application/calendar, */*",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export type VillaIcalSourceSyncResult = {
  sourceId: string;
  sourceName: string;
  ok: boolean;
  message: string;
  importedCount: number;
  removedCount: number;
  updatedDays: number;
};

export async function syncVillaIcalSource(
  sourceId: string
): Promise<VillaIcalSourceSyncResult> {
  const source = await prisma.villaIcalSource.findUnique({
    where: { id: sourceId },
    include: {
      villa: { select: { id: true, name: true } },
      importedBlocks: true,
    },
  });

  if (!source) {
    return {
      sourceId,
      sourceName: "",
      ok: false,
      message: "Kaynak bulunamadı",
      importedCount: 0,
      removedCount: 0,
      updatedDays: 0,
    };
  }

  try {
    const icalText = await fetchIcalUrl(source.url);
    const events = parseIcalEvents(icalText);
    const existingByUid = new Map(
      source.importedBlocks.map((block) => [block.externalUid, block])
    );
    const incomingUids = new Set(events.map((event) => event.uid));

    let removedCount = 0;
    let updatedDays = 0;

    for (const block of source.importedBlocks) {
      if (incomingUids.has(block.externalUid)) continue;

      const result = await applyVillaPeriodDaysOccupancy(
        source.villaId,
        dbDateToDateKey(block.startDate),
        dbDateToDateKey(block.endDate),
        "EMPTY"
      );
      updatedDays += result.updatedDays;
      await prisma.villaIcalImportedBlock.delete({ where: { id: block.id } });
      removedCount += 1;
    }

    let importedCount = 0;

    for (const event of events) {
      const existing = existingByUid.get(event.uid);
      const changed =
        !existing ||
        dbDateToDateKey(existing.startDate) !== event.startDateKey ||
        dbDateToDateKey(existing.endDate) !== event.endDateKey;

      if (!changed) continue;

      if (existing) {
        const clearResult = await applyVillaPeriodDaysOccupancy(
          source.villaId,
          dbDateToDateKey(existing.startDate),
          dbDateToDateKey(existing.endDate),
          "EMPTY"
        );
        updatedDays += clearResult.updatedDays;
      }

      const applyResult = await applyVillaPeriodDaysOccupancy(
        source.villaId,
        event.startDateKey,
        event.endDateKey,
        "BOOKED"
      );
      updatedDays += applyResult.updatedDays;

      await prisma.villaIcalImportedBlock.upsert({
        where: {
          sourceId_externalUid: {
            sourceId: source.id,
            externalUid: event.uid,
          },
        },
        create: {
          sourceId: source.id,
          villaId: source.villaId,
          externalUid: event.uid,
          startDate: dateKeyToDbDate(event.startDateKey),
          endDate: dateKeyToDbDate(event.endDateKey),
        },
        update: {
          startDate: dateKeyToDbDate(event.startDateKey),
          endDate: dateKeyToDbDate(event.endDateKey),
        },
      });

      importedCount += 1;
    }

    const message = `${events.length} etkinlik okundu; ${importedCount} güncellendi, ${removedCount} kaldırıldı (${updatedDays} gün değişti)`;

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
          villaId: source.villaId,
          message: `iCal senkron (${source.name}): ${message}`,
        },
      }),
    ]);

    return {
      sourceId: source.id,
      sourceName: source.name,
      ok: true,
      message,
      importedCount,
      removedCount,
      updatedDays,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "iCal senkronu başarısız";

    await prisma.$transaction([
      prisma.villaIcalSource.update({
        where: { id: source.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "error",
          lastSyncMessage: message,
        },
      }),
      prisma.villaIcalSyncEvent.create({
        data: {
          villaId: source.villaId,
          message: `iCal senkron hatası (${source.name}): ${message}`,
        },
      }),
    ]);

    return {
      sourceId: source.id,
      sourceName: source.name,
      ok: false,
      message,
      importedCount: 0,
      removedCount: 0,
      updatedDays: 0,
    };
  }
}

export async function syncAllVillaIcalSources() {
  const sources = await prisma.villaIcalSource.findMany({
    orderBy: [{ villaId: "asc" }, { sortOrder: "asc" }],
    select: { id: true },
  });

  const results: VillaIcalSourceSyncResult[] = [];
  for (const source of sources) {
    results.push(await syncVillaIcalSource(source.id));
  }

  return results;
}

export async function syncVillaIcalSourcesForVilla(villaId: string) {
  const sources = await prisma.villaIcalSource.findMany({
    where: { villaId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const results: VillaIcalSourceSyncResult[] = [];
  for (const source of sources) {
    results.push(await syncVillaIcalSource(source.id));
  }

  return results;
}
