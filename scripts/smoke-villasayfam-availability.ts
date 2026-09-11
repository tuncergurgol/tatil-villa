/**
 * Villa Sayfam takvim smoke testi (Villa Ela Duo / Cracus örnek verisi).
 * npx tsx scripts/smoke-villasayfam-availability.ts
 */
import { parseVillasayfamAvailability } from "../lib/external-villa-page-scrape";
import { resolveVillaDayVisualFromMap } from "../lib/villa-period-day-visual";

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`ok — ${label}`);
}

function assertBooked(map: Map<string, string>, dateKey: string, label: string) {
  assert(map.get(dateKey) === "BOOKED", label);
}

function assertEmpty(map: Map<string, string>, dateKey: string, label: string) {
  assert(!map.has(dateKey) || map.get(dateKey) === "EMPTY", label);
}

// Kaynak sitedeki dolu aralıklar: 24–27, 27–30 Tem; 30 Tem–3 Ağu, 3–6, 6–9 Ağu
const map = parseVillasayfamAvailability([
  { source: "BLOCK", startDate: "2026-07-24", endDate: "2026-07-26" },
  { source: "BLOCK", startDate: "2026-07-27", endDate: "2026-07-29" },
  { source: "BLOCK", startDate: "2026-07-30", endDate: "2026-08-02" },
  { source: "BLOCK", startDate: "2026-08-03", endDate: "2026-08-05" },
  { source: "BLOCK", startDate: "2026-08-06", endDate: "2026-08-08" },
]);

// Son konaklanan geceler dolu
assertBooked(map, "2026-07-26", "26 Temmuz son gece (24–27 çıkışı)");
assertBooked(map, "2026-07-29", "29 Temmuz son gece (27–30 çıkışı)");
assertBooked(map, "2026-08-02", "2 Ağustos son gece (30 Tem–3 Ağu çıkışı)");
assertBooked(map, "2026-08-05", "5 Ağustos son gece (3–6 Ağu çıkışı)");
assertBooked(map, "2026-08-08", "8 Ağustos son gece (6–9 Ağu çıkışı)");

// Çıkış sabahları boş (ertesi rezervasyon aynı gün giriş yapıyorsa o gün dolu kalır)
assertEmpty(map, "2026-07-23", "23 Temmuz müsait");
assertBooked(map, "2026-07-27", "27 Temmuz yeni giriş gecesi");
assertBooked(map, "2026-07-30", "30 Temmuz giriş gecesi dolu");
assertBooked(map, "2026-08-03", "3 Ağustos giriş gecesi dolu");
assertBooked(map, "2026-08-06", "6 Ağustos giriş gecesi dolu");
assertEmpty(map, "2026-08-09", "9 Ağustos çıkış sonrası müsait");

// Görsel: son gece dolu, çıkış ertesi gün
assert(
  resolveVillaDayVisualFromMap("2026-08-02", map) === "full",
  "2 Ağustos dolu (son gece değil çıkış öncesi gece)"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-08", map) === "full",
  "8 Ağustos dolu (son konaklama gecesi)"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-09", map) === "check_out",
  "9 Ağustos çıkış günü"
);

console.log("\nVilla Sayfam availability smoke geçti.");
