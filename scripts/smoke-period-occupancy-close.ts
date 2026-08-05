/**
 * Admin / WhatsApp takvim kapatma: seçilen günler dahil aralık olarak uygulanır.
 * Çalıştır: npx tsx scripts/smoke-period-occupancy-close.ts
 */
import {
  buildBookedOccupancyForInclusiveRange,
  buildBookedOccupancyForStay,
  buildEmptyOccupancyForInclusiveRange,
} from "../lib/villa-period-selection";
import { buildOccupancyMap } from "../lib/booking-calendar-selection";
import { resolveVillaDayVisualFromMap } from "../lib/villa-period-day-visual";
import { dbDateToDateKey } from "../lib/villa-period-calendar";

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`ok — ${label}`);
}

const close810 = buildBookedOccupancyForInclusiveRange("2026-08-08", "2026-08-10");
assert(close810.get("2026-08-07") === undefined, "8–10 kapatınca 7 Ağustos dokunulmaz");
assert(close810.get("2026-08-08") === "BOOKED", "8 Ağustos BOOKED");
assert(close810.get("2026-08-09") === "BOOKED", "9 Ağustos BOOKED");
assert(close810.get("2026-08-10") === "BOOKED", "10 Ağustos BOOKED (dahil aralık)");
assert(close810.get("2026-08-11") === undefined, "8–10 kapatınca 11 Ağustos dokunulmaz");

const map810 = buildOccupancyMap(
  [...close810.entries()].map(([date, occupancyStatus]) => ({
    date,
    occupancyStatus,
  }))
);
assert(
  resolveVillaDayVisualFromMap("2026-08-08", map810) === "check_in",
  "8 Ağustos blok girişi görünür"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-09", map810) === "full",
  "9 Ağustos tam dolu"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-10", map810) === "full",
  "10 Ağustos tam dolu (çıkış günü değil)"
);

const open810 = buildEmptyOccupancyForInclusiveRange("2026-08-08", "2026-08-10");
assert(open810.get("2026-08-08") === "EMPTY", "8–10 açınca 8 Ağustos EMPTY");
assert(open810.get("2026-08-09") === "EMPTY", "8–10 açınca 9 Ağustos EMPTY");
assert(open810.get("2026-08-10") === "EMPTY", "8–10 açınca 10 Ağustos EMPTY");

const close69Stay = buildBookedOccupancyForStay("2026-08-06", "2026-08-09", new Map());
assert(close69Stay.get("2026-08-06") === "BOOKED", "rezervasyon: 6 Ağustos BOOKED");
assert(close69Stay.get("2026-08-07") === "BOOKED", "rezervasyon: 7 Ağustos BOOKED");
assert(close69Stay.get("2026-08-08") === "BOOKED", "rezervasyon: 8 Ağustos BOOKED");
assert(close69Stay.get("2026-08-09") === "EMPTY", "rezervasyon: 9 Ağustos çıkış günü EMPTY");

const map69Stay = buildOccupancyMap(
  [...close69Stay.entries()].map(([date, occupancyStatus]) => ({
    date,
    occupancyStatus,
  }))
);
assert(
  resolveVillaDayVisualFromMap("2026-08-09", map69Stay) === "check_out",
  "rezervasyon çıkış günü görünür"
);

const priorCheckout = new Map<string, "BOOKED" | "EMPTY">([
  ["2026-07-31", "BOOKED"],
  ["2026-08-01", "EMPTY"],
]);
const closeAfterPrior = buildBookedOccupancyForStay(
  "2026-08-01",
  "2026-08-05",
  priorCheckout
);
assert(
  closeAfterPrior.get("2026-08-01") === "EMPTY",
  "rezervasyon: önceki çıkış günü varsa 1 Ağustos turnover için EMPTY"
);

assert(
  dbDateToDateKey(new Date("2026-08-06T00:00:00.000Z")) === "2026-08-06",
  "dbDateToDateKey UTC gece yarısı kaydırmaz"
);

console.log("\nTüm period occupancy smoke senaryoları geçti.");
