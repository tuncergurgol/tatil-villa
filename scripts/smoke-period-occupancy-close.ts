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

const close15 = buildBookedOccupancyForStay("2026-08-01", "2026-08-05", new Map());
assert(close15.get("2026-08-01") === "BOOKED", "1 Ağustos giriş günü BOOKED");
assert(close15.get("2026-08-02") === "BOOKED", "2 Ağustos BOOKED");
assert(close15.get("2026-08-03") === "BOOKED", "3 Ağustos BOOKED");
assert(close15.get("2026-08-04") === "BOOKED", "4 Ağustos BOOKED");
assert(close15.get("2026-08-05") === "EMPTY", "5 Ağustos çıkış günü EMPTY");
assert(close15.get("2026-08-06") === undefined, "1–5 kapatınca 6 Ağustos dokunulmaz");

const map15 = buildOccupancyMap(
  [...close15.entries()].map(([date, occupancyStatus]) => ({
    date,
    occupancyStatus,
  }))
);
assert(
  resolveVillaDayVisualFromMap("2026-08-01", map15) === "check_in",
  "1 Ağustos giriş görünür"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-02", map15) === "full",
  "2 Ağustos tam dolu"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-05", map15) === "check_out",
  "5 Ağustos çıkış görünür"
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
  "önceki çıkış günü varsa 1 Ağustos turnover için EMPTY"
);
const mapAfterPrior = buildOccupancyMap(
  [...closeAfterPrior.entries(), ...priorCheckout.entries()].map(
    ([date, occupancyStatus]) => ({ date, occupancyStatus })
  )
);
assert(
  resolveVillaDayVisualFromMap("2026-08-01", mapAfterPrior) === "turnover_booked",
  "1 Ağustos giriş+çıkış (turnover) görünür"
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
