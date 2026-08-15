/**
 * Takvim kapatma: bitiş tarihi çıkış günü (giriş–çıkış kuralı).
 * Çalıştır: npx tsx scripts/smoke-period-occupancy-close.ts
 */
import {
  buildBookedOccupancyForStay,
  buildReservedOccupancyForStay,
} from "../lib/villa-period-selection";
import { buildOccupancyMap } from "../lib/booking-calendar-selection";
import { parseVillavillamAvailability } from "../lib/external-villa-page-scrape";
import { resolveVillaDayVisualFromMap, getPublicVillaDayVisualStyle } from "../lib/villa-period-day-visual";
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

// 5–7 dolu blok çıkışı üstüne 7–9 KAPAT: 7 aynı gün çıkış + giriş.
const priorBlock5to7 = new Map<string, "BOOKED" | "EMPTY">([
  ["2026-08-05", "BOOKED"],
  ["2026-08-06", "BOOKED"],
  ["2026-08-07", "EMPTY"],
  ["2026-08-08", "EMPTY"],
  ["2026-08-09", "EMPTY"],
]);
const close7to9 = buildBookedOccupancyForStay(
  "2026-08-07",
  "2026-08-09",
  priorBlock5to7
);
const close7to9Map = buildOccupancyMap(
  [...priorBlock5to7, ...close7to9.entries()].map(
    ([date, occupancyStatus]) => ({ date, occupancyStatus })
  )
);
const close7to9CheckIns = new Set(["2026-08-07"]);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-07",
    close7to9Map,
    close7to9CheckIns
  ) === "turnover_booked",
  "7 Ağustos mevcut çıkış üstüne KAPAT başlangıcı giriş+çıkış"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-08",
    close7to9Map,
    close7to9CheckIns
  ) === "full",
  "8 Ağustos tam dolu"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-09",
    close7to9Map,
    close7to9CheckIns
  ) === "check_out",
  "9 Ağustos çıkış"
);

const close810 = buildBookedOccupancyForStay("2026-08-08", "2026-08-10", new Map());
assert(close810.get("2026-08-10") === "EMPTY", "10 Ağustos çıkış günü EMPTY");

// Villa 1397 senaryosu: 31 Tem–5 Ağu rezervasyon + 5–9 kapama + 10–13 rezervasyon

const resJul31Aug5 = buildReservedOccupancyForStay(
  "2026-07-31",
  "2026-08-05",
  new Map()
);
assert(resJul31Aug5.get("2026-08-05") === "EMPTY", "31 Tem–5 Ağu çıkış EMPTY");
assert(resJul31Aug5.get("2026-08-04") === "RESERVED", "4 Ağustos RESERVED");

const resMap = new Map(resJul31Aug5);
const close5to9 = buildBookedOccupancyForStay(
  "2026-08-05",
  "2026-08-09",
  resMap
);
assert(
  close5to9.get("2026-08-05") === "EMPTY",
  "5 Ağustos rezervasyon çıkışı + kapama girişi turnover EMPTY"
);
assert(close5to9.get("2026-08-06") === "BOOKED", "6 Ağustos kapama BOOKED");

const afterCloseMap = new Map([...resMap, ...close5to9]);
const resAug10to13 = buildReservedOccupancyForStay(
  "2026-08-10",
  "2026-08-13",
  afterCloseMap
);
assert(
  resAug10to13.get("2026-08-10") === "RESERVED",
  "10 Ağustos rezervasyon girişi RESERVED (11 değil)"
);
assert(resAug10to13.get("2026-08-11") === "RESERVED", "11 Ağustos RESERVED");
assert(resAug10to13.get("2026-08-13") === "EMPTY", "13 Ağustos çıkış EMPTY");

const villa1397Map = buildOccupancyMap(
  [...afterCloseMap, ...resAug10to13.entries()].map(([date, occupancyStatus]) => ({
    date,
    occupancyStatus,
  }))
);
assert(
  resolveVillaDayVisualFromMap("2026-08-05", villa1397Map) ===
    "reserved_out_booked_in",
  "5 Ağustos yeşil çıkış + kırmızı giriş"
);

// Kapama 6–10 (çıkış 10 Ağu) + aynı gün rezervasyon girişi
const close6to10 = buildBookedOccupancyForStay(
  "2026-08-06",
  "2026-08-10",
  resMap
);
const afterClose610Map = new Map([...resMap, ...close6to10]);
const resAug10after610 = buildReservedOccupancyForStay(
  "2026-08-10",
  "2026-08-13",
  afterClose610Map
);
assert(
  resAug10after610.get("2026-08-10") === "RESERVED",
  "6–10 kapama sonrası 10 Ağustos RESERVED"
);
const villa1397Map610 = buildOccupancyMap(
  [...afterClose610Map, ...resAug10after610.entries()].map(
    ([date, occupancyStatus]) => ({ date, occupancyStatus })
  )
);
assert(
  resolveVillaDayVisualFromMap("2026-08-10", villa1397Map610) ===
    "booked_out_reserved_in",
  "10 Ağustos kırmızı çıkış + yeşil giriş"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-11", villa1397Map610) === "reserved_full",
  "11 Ağustos tam rezervasyon (giriş değil)"
);

// 5–9 + 8–10 kapama üst üste: 8 Ağu turnover
const close59ForOverlay = buildBookedOccupancyForStay(
  "2026-08-05",
  "2026-08-09",
  resMap
);
const overlayBase = new Map([...resMap, ...close59ForOverlay]);
const close810overlay = buildBookedOccupancyForStay(
  "2026-08-08",
  "2026-08-10",
  overlayBase
);
const overlayMap = buildOccupancyMap(
  [...overlayBase, ...close810overlay.entries()].map(
    ([date, occupancyStatus]) => ({ date, occupancyStatus })
  )
);
assert(
  resolveVillaDayVisualFromMap("2026-08-05", overlayMap) ===
    "reserved_out_booked_in",
  "5 Ağustos yeşil çıkış + kırmızı giriş (overlay)"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-06", overlayMap) === "full",
  "6 Ağustos tam kapama"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-08", overlayMap) === "check_out",
  "8 Ağustos bitişik bloklarda yalnızca çıkış"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-09", overlayMap) === "check_in",
  "9 Ağustos bitişik bloklarda giriş"
);

const aug10Public = getPublicVillaDayVisualStyle(
  resolveVillaDayVisualFromMap("2026-08-10", villa1397Map610)
);
assert(
  aug10Public.statusLabel === "Giriş+Çıkış" &&
    !aug10Public.background.includes("#fcd34d"),
  "public 10 Ağustos sarı opsiyon değil, pembe giriş-çıkış"
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

// Villa Hayal Duo / Deneme: kapama bitişi mevcut giriş gününe denk gelince
// çıkış+giriş (EMPTY + check-in) olmalı; dolu yazılmamalı.
const priorAug18CheckIn = new Map<string, "BOOKED" | "EMPTY">([
  ["2026-08-14", "BOOKED"],
  ["2026-08-15", "EMPTY"],
  ["2026-08-16", "EMPTY"],
  ["2026-08-17", "EMPTY"],
  ["2026-08-18", "BOOKED"],
  ["2026-08-19", "BOOKED"],
  ["2026-08-20", "BOOKED"],
]);
const close15to18OntoCheckIn = buildBookedOccupancyForStay(
  "2026-08-15",
  "2026-08-18",
  priorAug18CheckIn
);
assert(
  close15to18OntoCheckIn.get("2026-08-15") === "EMPTY",
  "15 Ağustos önceki blok çıkışı üzerine turnover EMPTY"
);
assert(close15to18OntoCheckIn.get("2026-08-16") === "BOOKED", "16 Ağustos kapama BOOKED");
assert(close15to18OntoCheckIn.get("2026-08-17") === "BOOKED", "17 Ağustos kapama BOOKED");
assert(
  close15to18OntoCheckIn.get("2026-08-18") === "EMPTY",
  "18 Ağustos mevcut giriş üstüne kapama bitişi EMPTY (çıkış+giriş)"
);
const hayalDuoMap = buildOccupancyMap(
  [...priorAug18CheckIn, ...close15to18OntoCheckIn.entries()].map(
    ([date, occupancyStatus]) => ({ date, occupancyStatus })
  )
);
const hayalDuoCheckIns = new Set(["2026-08-15", "2026-08-18"]);
assert(
  resolveVillaDayVisualFromMap("2026-08-18", hayalDuoMap, hayalDuoCheckIns) ===
    "turnover_booked",
  "18 Ağustos çıkış+giriş görünür"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-19", hayalDuoMap, hayalDuoCheckIns) ===
    "full",
  "19 Ağustos dolu görünür"
);

// 12–14 KAPAT, mevcut 14 giriş + 15 dolu + 16 çıkış → 14 çıkış+giriş
const priorAug12to16 = new Map<string, "BOOKED" | "EMPTY">([
  ["2026-08-10", "BOOKED"],
  ["2026-08-11", "BOOKED"],
  ["2026-08-12", "BOOKED"],
  ["2026-08-13", "EMPTY"],
  ["2026-08-14", "BOOKED"],
  ["2026-08-15", "BOOKED"],
  ["2026-08-16", "EMPTY"],
]);
const close12to14 = buildBookedOccupancyForStay(
  "2026-08-12",
  "2026-08-14",
  priorAug12to16
);
assert(close12to14.get("2026-08-12") === "EMPTY", "12 Ağustos önceki dolu gece üstüne turnover EMPTY");
assert(close12to14.get("2026-08-13") === "BOOKED", "13 Ağustos kapama BOOKED");
assert(
  close12to14.get("2026-08-14") === "EMPTY",
  "14 Ağustos kapama bitişi EMPTY"
);
const close12to14Map = buildOccupancyMap(
  [...priorAug12to16, ...close12to14.entries()].map(
    ([date, occupancyStatus]) => ({ date, occupancyStatus })
  )
);
const close12to14CheckIns = new Set(["2026-08-12", "2026-08-14"]);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-14",
    close12to14Map,
    close12to14CheckIns
  ) === "turnover_booked",
  "14 Ağustos çıkış+giriş görünür"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-15",
    close12to14Map,
    close12to14CheckIns
  ) === "full",
  "15 Ağustos dolu kalır"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-16",
    close12to14Map,
    close12to14CheckIns
  ) === "check_out",
  "16 Ağustos çıkış kalır"
);

// Tek gece kapama (11–12): önceki gece dolu olsa bile 11 BOOKED yazılmalı
const priorBeforeSingleNight = new Map<string, "BOOKED" | "EMPTY">([
  ["2026-08-09", "BOOKED"],
  ["2026-08-10", "BOOKED"],
  ["2026-08-11", "EMPTY"],
  ["2026-08-12", "EMPTY"],
  ["2026-08-13", "BOOKED"],
  ["2026-08-14", "BOOKED"],
]);
const close11to12 = buildBookedOccupancyForStay(
  "2026-08-11",
  "2026-08-12",
  priorBeforeSingleNight
);
assert(
  close11to12.get("2026-08-11") === "BOOKED",
  "11–12 kapamada 11 Ağustos BOOKED (tek gece)"
);
assert(
  close11to12.get("2026-08-12") === "EMPTY",
  "11–12 kapamada 12 Ağustos çıkış EMPTY"
);
const close11to12Map = buildOccupancyMap(
  [...priorBeforeSingleNight, ...close11to12.entries()].map(
    ([date, occupancyStatus]) => ({ date, occupancyStatus })
  )
);
const close11to12CheckIns = new Set(["2026-08-11"]);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-11",
    close11to12Map,
    close11to12CheckIns
  ) === "turnover_booked",
  "11 Ağustos önceki dolu gece üstüne tek gece giriş → çıkış+giriş"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-12",
    close11to12Map,
    close11to12CheckIns
  ) === "check_out",
  "12 Ağustos bitişik sonraki blokta yalnızca çıkış"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-13",
    close11to12Map,
    close11to12CheckIns
  ) === "check_in",
  "13 Ağustos sonraki blok girişi"
);

// 15–16 tek gece KAPAT: önceki blok çıkışı (15 EMPTY) üstüne → 15 çıkış+giriş
const priorBefore15to16 = new Map<string, "BOOKED" | "EMPTY">([
  ["2026-08-13", "BOOKED"],
  ["2026-08-14", "BOOKED"],
  ["2026-08-15", "EMPTY"],
  ["2026-08-16", "EMPTY"],
  ["2026-08-17", "BOOKED"],
  ["2026-08-18", "BOOKED"],
]);
const close15to16 = buildBookedOccupancyForStay(
  "2026-08-15",
  "2026-08-16",
  priorBefore15to16
);
assert(
  close15to16.get("2026-08-15") === "BOOKED",
  "15–16 kapamada 15 Ağustos BOOKED (tek gece; EMPTY yazılsa gece kalmaz)"
);
assert(
  close15to16.get("2026-08-16") === "EMPTY",
  "15–16 kapamada 16 Ağustos çıkış EMPTY"
);
const close15to16Map = buildOccupancyMap(
  [...priorBefore15to16, ...close15to16.entries()].map(
    ([date, occupancyStatus]) => ({ date, occupancyStatus })
  )
);
const close15to16CheckIns = new Set(["2026-08-15"]);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-15",
    close15to16Map,
    close15to16CheckIns
  ) === "turnover_booked",
  "15 Ağustos çıkış+giriş görünür (dolu değil)"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-16",
    close15to16Map,
    close15to16CheckIns
  ) === "check_out",
  "16 Ağustos bitişik blokta yalnızca çıkış"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-17",
    close15to16Map,
    close15to16CheckIns
  ) === "check_in",
  "17 Ağustos sonraki blok girişi"
);

// 18–20 boş + 21+ dolu iken 18–19 KAPAT: 18 giriş, 19 çıkış, 20 boş kalır
const prior18to20Empty = new Map<string, "BOOKED" | "EMPTY">([
  ["2026-08-16", "BOOKED"],
  ["2026-08-17", "BOOKED"],
  ["2026-08-18", "EMPTY"],
  ["2026-08-19", "EMPTY"],
  ["2026-08-20", "EMPTY"],
  ["2026-08-21", "BOOKED"],
  ["2026-08-22", "BOOKED"],
  ["2026-08-23", "EMPTY"],
]);
const close18to19 = buildBookedOccupancyForStay(
  "2026-08-18",
  "2026-08-19",
  prior18to20Empty
);
assert(close18to19.get("2026-08-18") === "BOOKED", "18 Ağustos kapama gecesi BOOKED");
assert(close18to19.get("2026-08-19") === "EMPTY", "19 Ağustos çıkış EMPTY");
assert(
  prior18to20Empty.get("2026-08-20") === "EMPTY",
  "20 Ağustos kapamadan etkilenmeden EMPTY kalır"
);
const close18to19Merged = new Map([...prior18to20Empty, ...close18to19]);
const close18to19Map = buildOccupancyMap(
  [...close18to19Merged.entries()].map(([date, occupancyStatus]) => ({
    date,
    occupancyStatus,
  }))
);
const close18to19CheckIns = new Set(["2026-08-18"]);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-18",
    close18to19Map,
    close18to19CheckIns
  ) === "turnover_booked",
  "18 Ağustos önceki dolu üstüne çıkış+giriş"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-19",
    close18to19Map,
    close18to19CheckIns
  ) === "check_out",
  "19 Ağustos yalnızca çıkış (sonraki gün boş)"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-20",
    close18to19Map,
    close18to19CheckIns
  ) === "empty",
  "20 Ağustos boş kalır"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-21",
    close18to19Map,
    close18to19CheckIns
  ) === "check_in",
  "21 Ağustos sonraki blok girişi"
);

// 18–19 KAPAT, ertesi gün (20) zaten dolu: bitişik çıkış+giriş, tek parça dolu değil
const prior20Booked = new Map(prior18to20Empty);
prior20Booked.set("2026-08-20", "BOOKED");
const close18to19Onto20 = buildBookedOccupancyForStay(
  "2026-08-18",
  "2026-08-19",
  prior20Booked
);
const close18to19Onto20Map = buildOccupancyMap(
  [...prior20Booked, ...close18to19Onto20.entries()].map(
    ([date, occupancyStatus]) => ({ date, occupancyStatus })
  )
);
const close18to19Onto20CheckIns = new Set(["2026-08-18"]);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-19",
    close18to19Onto20Map,
    close18to19Onto20CheckIns
  ) === "check_out",
  "19 Ağustos ertesi blok dolu olsa bile yalnızca çıkış"
);
assert(
  resolveVillaDayVisualFromMap(
    "2026-08-20",
    close18to19Onto20Map,
    close18to19Onto20CheckIns
  ) === "check_in",
  "20 Ağustos sonraki blok girişi ayrı kalır"
);

assert(
  dbDateToDateKey(new Date("2026-08-06T00:00:00.000Z")) === "2026-08-06",
  "dbDateToDateKey UTC gece yarısı kaydırmaz"
);

const villavillamPierre2 = parseVillavillamAvailability({
  Symbol: "₺",
  data: {
    doluGirisler: ["2026-08-26"],
    doluGunler: [
      "2026-08-27",
      "2026-08-28",
      "2026-08-29",
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
    ],
    odemeGunler: [],
    fiyatlarTarihler: [],
    fiyatlar: [],
  },
});
const pierre2Map = villavillamPierre2.occupancyByDateKey;
assert(
  (pierre2Map.get("2026-08-25") ?? "EMPTY") === "EMPTY",
  "villavillam: 25 Ağustos giriş günü değil, boş kalmalı"
);
assert(pierre2Map.get("2026-08-26") === "BOOKED", "villavillam: 26 Ağustos giriş gecesi dolu");
assert(
  resolveVillaDayVisualFromMap("2026-08-25", pierre2Map) === "empty",
  "villavillam: 25 Ağustos müsait görünür"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-26", pierre2Map) === "check_in",
  "villavillam: 26 Ağustos giriş görünür"
);

const villavillamOpaline = parseVillavillamAvailability({
  Symbol: "₺",
  data: {
    doluGirisler: ["2026-08-08", "2026-08-12"],
    doluGunler: [
      "2026-08-09",
      "2026-08-10",
      "2026-08-11",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
    ],
    odemeGunler: [],
    fiyatlarTarihler: [],
    fiyatlar: [],
  },
});
const opalineMap = villavillamOpaline.occupancyByDateKey;
assert(
  opalineMap.get("2026-08-12") === "BOOKED",
  "villavillam Opaline: 12 Ağustos ikinci blok giriş gecesi dolu"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-12", opalineMap) === "full",
  "villavillam Opaline: 12 Ağustos çıkış değil, dolu görünür"
);

console.log("\nTüm period occupancy smoke senaryoları geçti.");
