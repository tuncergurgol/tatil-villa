/**
 * Admin edit takvim: kendi BOOKED geceleri seçilebilir, başkasının değil.
 * Çalıştır: npx tsx scripts/smoke-booking-occupancy-allow-stay.ts
 */
import {
  buildOccupancyMap,
  canSelectStayDay,
  isNightBlocked,
  rangeHasBlockedNight,
} from "../lib/booking-calendar-selection";

function assert(condition: boolean, label: string) {
  if (!condition) {
    throw new Error(`FAIL: ${label}`);
  }
  console.log(`ok — ${label}`);
}

const today = new Date(Date.UTC(2026, 6, 1)); // 2026-07-01

// 116004: 13–16 Temmuz → geceler 13,14,15 BOOKED
const occupancyMap = buildOccupancyMap([
  { date: "2026-07-12", occupancyStatus: "EMPTY" },
  { date: "2026-07-13", occupancyStatus: "BOOKED" },
  { date: "2026-07-14", occupancyStatus: "BOOKED" },
  { date: "2026-07-15", occupancyStatus: "BOOKED" },
  { date: "2026-07-16", occupancyStatus: "EMPTY" },
  { date: "2026-07-17", occupancyStatus: "EMPTY" },
]);

const own116004 = { checkIn: "2026-07-13", checkOut: "2026-07-16" };

assert(
  isNightBlocked(occupancyMap, "2026-07-13") === true,
  "başka formda 13 BOOKED engellenir"
);
assert(
  isNightBlocked(occupancyMap, "2026-07-13", own116004) === false,
  "116004 kendi formunda 13 seçilebilir"
);
assert(
  isNightBlocked(occupancyMap, "2026-07-15", own116004) === false,
  "116004 kendi formunda 15 seçilebilir"
);
assert(
  isNightBlocked(occupancyMap, "2026-07-16", own116004) === false,
  "check-out günü zaten EMPTY"
);

assert(
  rangeHasBlockedNight("2026-07-13", "2026-07-16", occupancyMap) === true,
  "116002 aralığı 13–16 kapalı"
);
assert(
  rangeHasBlockedNight("2026-07-13", "2026-07-16", occupancyMap, own116004) ===
    false,
  "116004 kendi aralığı açık"
);
assert(
  rangeHasBlockedNight("2026-07-13", "2026-07-17", occupancyMap, own116004) ===
    false,
  "kendi BOOKED + ek EMPTY gece açık"
);

assert(
  canSelectStayDay({
    dateKey: "2026-07-13",
    today,
    pendingStart: null,
    occupancyMap,
  }) === false,
  "seçim: yabancı BOOKED tıklanamaz"
);
assert(
  canSelectStayDay({
    dateKey: "2026-07-13",
    today,
    pendingStart: null,
    occupancyMap,
    allowStay: own116004,
  }) === true,
  "seçim: kendi BOOKED tıklanabilir"
);
assert(
  canSelectStayDay({
    dateKey: "2026-07-16",
    today,
    pendingStart: "2026-07-13",
    occupancyMap,
    allowStay: own116004,
  }) === true,
  "seçim: kendi aralıktan çıkış 16 OK"
);

console.log("\nTüm smoke senaryoları geçti.");
