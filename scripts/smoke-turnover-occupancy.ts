/**
 * Giriş+çıkış (turnover) günü smoke testi.
 * Çalıştır: npx tsx scripts/smoke-turnover-occupancy.ts
 */
import {
  buildOccupancyMap,
  isOccupancyNightBlocked,
} from "../lib/booking-calendar-selection";
import {
  resolveVillaDayVisualFromMap,
} from "../lib/villa-period-day-visual";

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`ok — ${label}`);
}

const occupancyMap = buildOccupancyMap([
  { date: "2026-08-01", occupancyStatus: "BOOKED" },
  { date: "2026-08-02", occupancyStatus: "BOOKED" },
  { date: "2026-08-03", occupancyStatus: "BOOKED" },
  { date: "2026-08-04", occupancyStatus: "BOOKED" },
  { date: "2026-08-05", occupancyStatus: "BOOKED" },
  { date: "2026-08-06", occupancyStatus: "EMPTY" },
  { date: "2026-08-07", occupancyStatus: "BOOKED" },
  { date: "2026-08-08", occupancyStatus: "BOOKED" },
  { date: "2026-08-11", occupancyStatus: "BOOKED" },
  { date: "2026-08-12", occupancyStatus: "EMPTY" },
  { date: "2026-08-13", occupancyStatus: "BOOKED" },
]);
// Aynı gün çıkış+giriş yalnızca giriş işareti olan günde geçerlidir.
const checkInDateKeys = new Set(["2026-08-06", "2026-08-12"]);

assert(
  resolveVillaDayVisualFromMap("2026-08-06", occupancyMap, checkInDateKeys) ===
    "turnover_booked",
  "6 Ağustos giriş+çıkış görünür"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-07", occupancyMap, checkInDateKeys) ===
    "full",
  "7 Ağustos dolu (yanlış giriş değil)"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-12", occupancyMap, checkInDateKeys) ===
    "turnover_booked",
  "12 Ağustos giriş+çıkış görünür"
);
assert(
  isOccupancyNightBlocked(occupancyMap, "2026-08-06", undefined, undefined, checkInDateKeys) === true,
  "turnover gecesi engellenir (checkIn işaretiyle)"
);
assert(
  isOccupancyNightBlocked(occupancyMap, "2026-08-06") === true,
  "turnover gecesi engellenir (bitişik blok fallback)"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-05", occupancyMap, checkInDateKeys) ===
    "full",
  "normal dolu gece değişmez"
);

// Giriş işareti yoksa bitişik iki blok birleşmez: 12 çıkış, 13 giriş
assert(
  resolveVillaDayVisualFromMap("2026-08-12", occupancyMap) === "check_out",
  "12 Ağustos giriş işareti yoksa yalnızca çıkış"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-13", occupancyMap) === "check_in",
  "13 Ağustos giriş işareti yoksa ayrı blok girişi"
);

// Tek başına çıkış: dolu bloktan sonra boşluk
const checkoutOnly = buildOccupancyMap([
  { date: "2026-07-13", occupancyStatus: "BOOKED" },
  { date: "2026-07-14", occupancyStatus: "BOOKED" },
  { date: "2026-07-15", occupancyStatus: "BOOKED" },
  { date: "2026-07-16", occupancyStatus: "EMPTY" },
  { date: "2026-07-17", occupancyStatus: "EMPTY" },
]);
assert(
  resolveVillaDayVisualFromMap("2026-07-16", checkoutOnly) === "check_out",
  "normal çıkış günü korunur"
);
assert(
  isOccupancyNightBlocked(checkoutOnly, "2026-07-16") === false,
  "çıkış günü gece olarak açık kalır"
);

// Rezervasyon formu bug'ı: giriş işareti yoksa 5 çıkış / 6 giriş görünür;
// işaretle birlikte 5 giriş+çıkış, 6 dolu olmalı.
const beyazIslamlarMap = buildOccupancyMap([
  { date: "2026-09-04", occupancyStatus: "BOOKED" },
  { date: "2026-09-05", occupancyStatus: "EMPTY" },
  { date: "2026-09-06", occupancyStatus: "BOOKED" },
  { date: "2026-09-07", occupancyStatus: "BOOKED" },
  { date: "2026-09-08", occupancyStatus: "EMPTY" },
  { date: "2026-09-09", occupancyStatus: "BOOKED" },
]);
const beyazIslamlarCheckIns = new Set(["2026-09-05", "2026-09-08"]);
assert(
  resolveVillaDayVisualFromMap("2026-09-05", beyazIslamlarMap) === "check_out",
  "işaret yoksa 5 yalnızca çıkış (eski rezervasyon formu hatası)"
);
assert(
  resolveVillaDayVisualFromMap("2026-09-06", beyazIslamlarMap) === "check_in",
  "işaret yoksa 6 yanlış giriş görünür"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-09-05",
    beyazIslamlarMap,
    beyazIslamlarCheckIns
  ) === "turnover_booked",
  "işaretle 5 giriş+çıkış"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-09-06",
    beyazIslamlarMap,
    beyazIslamlarCheckIns
  ) === "full",
  "işaretle 6 dolu"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-09-08",
    beyazIslamlarMap,
    beyazIslamlarCheckIns
  ) === "turnover_booked",
  "işaretle 8 giriş+çıkış"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-09-09",
    beyazIslamlarMap,
    beyazIslamlarCheckIns
  ) === "full",
  "işaretle 9 dolu"
);

console.log("\nTüm turnover smoke senaryoları geçti.");
