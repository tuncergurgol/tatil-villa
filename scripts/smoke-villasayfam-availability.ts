/**
 * Villa Sayfam Ağustos takvim smoke testi.
 * npx tsx scripts/smoke-villasayfam-availability.ts
 */
import { parseVillasayfamAvailability } from "../lib/external-villa-page-scrape";
import { resolveVillaDayVisualFromMap } from "../lib/villa-period-day-visual";

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`ok — ${label}`);
}

const map = parseVillasayfamAvailability([
  { source: "BLOCK", startDate: "2026-07-30", endDate: "2026-08-02" },
  { source: "BLOCK", startDate: "2026-08-03", endDate: "2026-08-05" },
  { source: "BLOCK", startDate: "2026-08-06", endDate: "2026-08-08" },
]);

assert(
  resolveVillaDayVisualFromMap("2026-08-02", map) === "full",
  "2 Ağustos giriş+çıkış değil dolu"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-05", map) === "full",
  "5 Ağustos giriş+çıkış değil dolu"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-09", map) === "empty",
  "9 Ağustos müsait"
);
assert(
  resolveVillaDayVisualFromMap("2026-08-08", map) === "check_out",
  "8 Ağustos çıkış günü"
);

console.log("\nVilla Sayfam availability smoke geçti.");
