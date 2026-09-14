/**
 * Elitvillam Villa Sunset 2 scraper duman testi.
 *   npx tsx scripts/smoke-elitvillam-sunset2.ts
 */
import { scrapeExternalVillaPage } from "../lib/external-villa-page-scrape";

const URL = "https://www.elitvillam.com/villa-sunset-2/";

async function main() {
  const scraped = await scrapeExternalVillaPage(URL);
  const booked = [...scraped.occupancyByDateKey.values()].filter(
    (v) => v === "BOOKED"
  ).length;
  const option = [...scraped.occupancyByDateKey.values()].filter(
    (v) => v === "OPTION"
  ).length;

  console.log({
    strategy: scraped.strategy,
    sourceHost: scraped.sourceHost,
    pageTitle: scraped.pageTitle,
    periods: scraped.periods.length,
    occupancyDays: scraped.occupancyByDateKey.size,
    booked,
    option,
    warnings: scraped.warnings,
    samplePeriods: scraped.periods.slice(0, 5).map((p) => ({
      start: p.startDate.toISOString().slice(0, 10),
      end: p.endDate.toISOString().slice(0, 10),
      nightly: p.nightlyPrice,
      weekly: p.weeklyPrice,
      deposit: p.damageDeposit,
    })),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
