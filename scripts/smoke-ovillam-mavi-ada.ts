/**
 * Ovillam Villa Mavi Ada scraper duman testi.
 *   npx tsx scripts/smoke-ovillam-mavi-ada.ts
 */
import { scrapeExternalVillaPage } from "../lib/external-villa-page-scrape";

const URL = "https://www.ovillam.com/Villa-Mavi-Ada";

async function main() {
  const scraped = await scrapeExternalVillaPage(URL);
  const aug22 = scraped.occupancyByDateKey.get("2026-08-22");
  const aug23 = scraped.occupancyByDateKey.get("2026-08-23");
  const booked = [...scraped.occupancyByDateKey.values()].filter(
    (v) => v === "BOOKED"
  ).length;

  console.log({
    strategy: scraped.strategy,
    sourceHost: scraped.sourceHost,
    periods: scraped.periods.length,
    occupancyDays: scraped.occupancyByDateKey.size,
    booked,
    aug22,
    aug23,
    warnings: scraped.warnings,
    samplePeriods: scraped.periods.slice(0, 4).map((p) => ({
      start: `${p.startDate.getFullYear()}-${String(p.startDate.getMonth() + 1).padStart(2, "0")}-${String(p.startDate.getDate()).padStart(2, "0")}`,
      end: `${p.endDate.getFullYear()}-${String(p.endDate.getMonth() + 1).padStart(2, "0")}-${String(p.endDate.getDate()).padStart(2, "0")}`,
      nightly: p.nightlyPrice,
    })),
  });

  if (scraped.strategy !== "ovillam") {
    throw new Error(`Beklenen strategy=ovillam, gelen=${scraped.strategy}`);
  }
  if (aug23 !== "BOOKED") {
    throw new Error(`2026-08-23 BOOKED olmalı, gelen=${aug23}`);
  }
  if (aug22 !== "BOOKED") {
    // Giriş gecesi doluGirisler → BOOKED (çıkış sabahı ayrı listede)
    throw new Error(`2026-08-22 giriş gecesi BOOKED olmalı, gelen=${aug22}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
