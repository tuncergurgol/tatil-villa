import { prisma } from "@/lib/db";
import {
  dbDateToDateKey,
  parseDateKey,
  toDateKey,
} from "@/lib/villa-period-calendar";
import { offsetDateKey } from "@/lib/villa-period-selection";

type OccupancyRange = {
  startKey: string;
  endKey: string;
  status: "BOOKED" | "OPTION";
};

function formatIcsDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${year}${month}${day}`;
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function mergeOccupancyRanges(
  days: Array<{ dateKey: string; status: "BOOKED" | "OPTION" }>
): OccupancyRange[] {
  if (days.length === 0) return [];

  const sorted = [...days].sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey, "en")
  );

  const ranges: OccupancyRange[] = [];
  let current: OccupancyRange | null = null;

  for (const day of sorted) {
    if (!current) {
      current = { startKey: day.dateKey, endKey: day.dateKey, status: day.status };
      continue;
    }

    const nextExpected = offsetDateKey(current.endKey, 1);
    if (day.dateKey === nextExpected && day.status === current.status) {
      current.endKey = day.dateKey;
      continue;
    }

    ranges.push(current);
    current = { startKey: day.dateKey, endKey: day.dateKey, status: day.status };
  }

  if (current) ranges.push(current);
  return ranges;
}

function buildVevent(
  uid: string,
  range: OccupancyRange,
  villaName: string,
  now: Date
) {
  const dtStamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const dtStart = formatIcsDate(range.startKey);
  const dtEnd = formatIcsDate(offsetDateKey(range.endKey, 1));
  const summary =
    range.status === "OPTION"
      ? `${villaName} - Opsiyon`
      : `${villaName} - Dolu`;

  return [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    "TRANSP:OPAQUE",
    range.status === "OPTION" ? "STATUS:TENTATIVE" : "STATUS:CONFIRMED",
    "END:VEVENT",
  ].join("\r\n");
}

export async function generateVillaIcalFeed(villaId: string, token: string) {
  const villa = await prisma.villa.findFirst({
    where: {
      id: villaId,
      icalExportToken: token,
      active: true,
    },
    select: {
      id: true,
      name: true,
      villaId: true,
    },
  });

  if (!villa) return null;

  const todayKey = toDateKey(new Date());
  const days = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId: villa.id,
      occupancyStatus: { in: ["BOOKED", "OPTION"] },
      date: { gte: parseDateKey(todayKey) },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      occupancyStatus: true,
    },
  });

  const occupancyDays = days.map((day) => ({
    dateKey: dbDateToDateKey(day.date),
    status: day.occupancyStatus as "BOOKED" | "OPTION",
  }));

  const ranges = mergeOccupancyRanges(occupancyDays);
  const now = new Date();
  const calendarUid = `villa-${villa.id}@tatil-villa`;

  const events = ranges.map((range, index) =>
    buildVevent(`${calendarUid}-${index}-${range.startKey}`, range, villa.name, now)
  );

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tatil Villa//iCal Export//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(villa.name)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return {
    villa,
    body,
  };
}
