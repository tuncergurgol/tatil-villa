/**
 * Admin takvim kapatma: giriş–çıkış günleri doğru yazılır.
 * Çalıştır: npx tsx scripts/smoke-period-occupancy-close.ts
 */
import { buildBookedOccupancyForStay, collectBookedNightsBeforeCheckInToClear } from "../lib/villa-period-selection";
import {
  buildOccupancyMap,
} from "../lib/booking-calendar-selection";
import { resolveVillaDayVisualFromMap } from "../lib/villa-period-day-visual";
import { dbDateToDateKey } from "../lib/villa-period-calendar";

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`ok — ${label}`);
}

const close69 = buildBookedOccupancyForStay("2026-08-06", "2026-08-09", new Map());
assert(close69.get("2026-08-05") === undefined, "6–9 kapatınca 5 Ağustos dokunulmaz");
assert(close69.get("2026-08-06") === "BOOKED", "6 Ağustos BOOKED");
assert(close69.get("2026-08-07") === "BOOKED", "7 Ağustos BOOKED");
assert(close69.get("2026-08-08") === "BOOKED", "8 Ağustos BOOKED");
assert(close69.get("2026-08-09") === "EMPTY", "9 Ağustos çıkış günü EMPTY");

const map = buildOccupancyMap(
  [...close69.entries()].map(([date, occupancyStatus]) => ({
    date,
    occupancyStatus,
  }))
);
assert(
  resolveVillaDayVisualFromMap("2026-08-06", map) === "check_in",
  "6 Ağustos giriş görünür"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-09", map) === "check_out",
  "9 Ağustos çıkış görünür"
);

assert(
  dbDateToDateKey(new Date("2026-08-06T00:00:00.000Z")) === "2026-08-06",
  "dbDateToDateKey UTC gece yarısı kaydırmaz"
);

const withPriorBlock = new Map<string, "BOOKED" | "EMPTY">([
  ["2026-08-01", "BOOKED"],
  ["2026-08-02", "BOOKED"],
  ["2026-08-03", "BOOKED"],
  ["2026-08-04", "BOOKED"],
  ["2026-08-05", "EMPTY"],
  ["2026-08-06", "EMPTY"],
]);
const toClear = collectBookedNightsBeforeCheckInToClear(
  "2026-08-06",
  withPriorBlock
);
assert(
  toClear.join(",") === "2026-08-04,2026-08-03,2026-08-02,2026-08-01",
  "6 Ağustos giriş öncesi bitişik dolu blok temizlenir"
);

console.log("\nTüm period occupancy smoke senaryoları geçti.");
