/**
 * Takvim kapatma: bitiş tarihi çıkış günü (giriş–çıkış kuralı).
 * Çalıştır: npx tsx scripts/smoke-period-occupancy-close.ts
 */
import { buildBookedOccupancyForStay } from "../lib/villa-period-selection";
import { buildOccupancyMap } from "../lib/booking-calendar-selection";
import { resolveVillaDayVisualFromMap } from "../lib/villa-period-day-visual";
import { dbDateToDateKey } from "../lib/villa-period-calendar";

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`ok — ${label}`);
}

const close1013 = buildBookedOccupancyForStay("2026-08-10", "2026-08-13", new Map());
assert(close1013.get("2026-08-09") === undefined, "10–13 kapatınca 9 Ağustos dokunulmaz");
assert(close1013.get("2026-08-10") === "BOOKED", "10 Ağustos giriş günü BOOKED");
assert(close1013.get("2026-08-11") === "BOOKED", "11 Ağustos BOOKED");
assert(close1013.get("2026-08-12") === "BOOKED", "12 Ağustos BOOKED");
assert(close1013.get("2026-08-13") === "EMPTY", "13 Ağustos çıkış günü EMPTY");
assert(close1013.get("2026-08-14") === undefined, "10–13 kapatınca 14 Ağustos dokunulmaz");

const map1013 = buildOccupancyMap(
  [...close1013.entries()].map(([date, occupancyStatus]) => ({
    date,
    occupancyStatus,
  }))
);
assert(
  resolveVillaDayVisualFromMap("2026-08-10", map1013) === "check_in",
  "10 Ağustos giriş görünür"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-12", map1013) === "full",
  "12 Ağustos tam dolu"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-13", map1013) === "check_out",
  "13 Ağustos çıkış görünür"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-14", map1013) === "empty",
  "14 Ağustos açık (yanlışlıkla çıkış görünmez)"
);

const close810 = buildBookedOccupancyForStay("2026-08-08", "2026-08-10", new Map());
assert(close810.get("2026-08-08") === "BOOKED", "8 Ağustos BOOKED");
assert(close810.get("2026-08-09") === "BOOKED", "9 Ağustos BOOKED");
assert(close810.get("2026-08-10") === "EMPTY", "10 Ağustos çıkış günü EMPTY");

const close69 = buildBookedOccupancyForStay("2026-08-06", "2026-08-09", new Map());
assert(close69.get("2026-08-06") === "BOOKED", "6 Ağustos BOOKED");
assert(close69.get("2026-08-07") === "BOOKED", "7 Ağustos BOOKED");
assert(close69.get("2026-08-08") === "BOOKED", "8 Ağustos BOOKED");
assert(close69.get("2026-08-09") === "EMPTY", "9 Ağustos çıkış günü EMPTY");

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
  "önceki çıkış günü varsa 1 Ağustos turnover için EMPTY"
);

assert(
  dbDateToDateKey(new Date("2026-08-06T00:00:00.000Z")) === "2026-08-06",
  "dbDateToDateKey UTC gece yarısı kaydırmaz"
);

console.log("\nTüm period occupancy smoke senaryoları geçti.");
