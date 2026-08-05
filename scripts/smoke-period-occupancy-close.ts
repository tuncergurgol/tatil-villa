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

const priorBlock1to10 = new Map<string, "BOOKED" | "EMPTY">(
  [...Array.from({ length: 9 }, (_, index) => {
    const day = index + 1;
    const key = `2026-08-${String(day).padStart(2, "0")}`;
    return [key, "BOOKED"] as const;
  }), ["2026-08-10", "EMPTY"] as const]
);

const close1013AfterPrior = buildBookedOccupancyForStay(
  "2026-08-10",
  "2026-08-13",
  priorBlock1to10
);
assert(
  close1013AfterPrior.get("2026-08-10") === "EMPTY",
  "1–10 çıkış gününde 10–13 kapatınca 10 Ağustos turnover için EMPTY"
);
assert(close1013AfterPrior.get("2026-08-11") === "BOOKED", "11 Ağustos BOOKED");
assert(close1013AfterPrior.get("2026-08-12") === "BOOKED", "12 Ağustos BOOKED");
assert(
  close1013AfterPrior.get("2026-08-13") === "EMPTY",
  "13 Ağustos çıkış günü EMPTY"
);

const map1013AfterPrior = buildOccupancyMap(
  [...priorBlock1to10, ...close1013AfterPrior.entries()].map(
    ([date, occupancyStatus]) => ({ date, occupancyStatus })
  )
);
assert(
  resolveVillaDayVisualFromMap("2026-08-10", map1013AfterPrior) ===
    "turnover_booked",
  "10 Ağustos giriş-çıkış görünür"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-11", map1013AfterPrior) === "full",
  "11 Ağustos tam dolu (yanlış giriş değil)"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-13", map1013AfterPrior) === "check_out",
  "13 Ağustos çıkış görünür"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-14", map1013AfterPrior) === "empty",
  "14 Ağustos açık kalır"
);

const priorBlock1to10WithBadAug10 = new Map(priorBlock1to10);
priorBlock1to10WithBadAug10.set("2026-08-10", "BOOKED");
const close1013FixBad10 = buildBookedOccupancyForStay(
  "2026-08-10",
  "2026-08-13",
  priorBlock1to10WithBadAug10
);
assert(
  close1013FixBad10.get("2026-08-10") === "EMPTY",
  "10 Ağustos hatalı BOOKED olsa bile turnover için EMPTY yazılır"
);

const close1013 = buildBookedOccupancyForStay("2026-08-10", "2026-08-13", new Map());
assert(close1013.get("2026-08-10") === "BOOKED", "boş takvimde 10 Ağustos giriş BOOKED");
assert(close1013.get("2026-08-13") === "EMPTY", "13 Ağustos çıkış EMPTY");

const priorBlock1to5 = new Map<string, "BOOKED" | "EMPTY">(
  [...Array.from({ length: 4 }, (_, index) => {
    const day = index + 1;
    const key = `2026-08-${String(day).padStart(2, "0")}`;
    return [key, "BOOKED"] as const;
  }), ["2026-08-05", "EMPTY"] as const]
);
const close69AfterPrior = buildBookedOccupancyForStay(
  "2026-08-06",
  "2026-08-09",
  priorBlock1to5
);
const adjacentMap = buildOccupancyMap(
  [...priorBlock1to5, ...close69AfterPrior.entries()].map(
    ([date, occupancyStatus]) => ({ date, occupancyStatus })
  )
);
assert(
  resolveVillaDayVisualFromMap("2026-08-05", adjacentMap) === "check_out",
  "bitişik bloklarda 5 Ağustos yalnızca çıkış"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-06", adjacentMap) === "check_in",
  "bitişik bloklarda 6 Ağustos giriş"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-05", adjacentMap) !== "turnover_booked",
  "bitişik bloklarda 5 Ağustos turnover değil"
);

const close810 = buildBookedOccupancyForStay("2026-08-08", "2026-08-10", new Map());
assert(close810.get("2026-08-10") === "EMPTY", "10 Ağustos çıkış günü EMPTY");

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
