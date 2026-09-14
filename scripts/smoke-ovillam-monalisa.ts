/**
 * Ovillam Villa Monalisa scraper duman testi.
 *   npx tsx scripts/smoke-ovillam-monalisa.ts
 */
import { scrapeExternalVillaPage } from "../lib/external-villa-page-scrape";

const URL = "https://www.ovillam.com/villa-monalisa";

async function main() {
  const scraped = await scrapeExternalVillaPage(URL);
  const booked = [...scraped.occupancyByDateKey.values()].filter(
    (v) => v === "BOOKED"
  ).length;

  console.log({
    strategy: scraped.strategy,
    sourceHost: scraped.sourceHost,
    periods: scraped.periods.length,
    occupancyDays: scraped.occupancyByDateKey.size,
    booked,
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
  if (scraped.periods.length === 0 && scraped.occupancyByDateKey.size === 0) {
    throw new Error("Periyot ve takvim bulunamadı");
  }
  if (scraped.periods.length === 0) {
    console.log("Not: ovillam'da fiyat yok; yalnızca takvim aktarılacak");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
