/**
 * Public villa sayfası scrape dry-run smoke.
 *
 *   npx tsx scripts/smoke-external-villa-page-scrape.ts
 *   npx tsx scripts/smoke-external-villa-page-scrape.ts --url=https://www.dalvillalari.com/villa-inci-incir
 *   npx tsx scripts/smoke-external-villa-page-scrape.ts --villa-id=<cuid> --write
 */
import { scrapeExternalVillaPage } from "../lib/external-villa-page-scrape";
import { importVillaPeriodsFromExternalPage } from "../lib/external-villa-page-import-runner";
import { toDateKey } from "../lib/villa-period-calendar";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  const url =
    argValue("url") ?? "https://www.dalvillalari.com/villa-inci-incir";
  const villaId = argValue("villa-id");
  const write = process.argv.includes("--write");

  console.log(`Scrape (dry): ${url}`);
  const scraped = await scrapeExternalVillaPage(url);

  console.log(
    JSON.stringify(
      {
        sourceHost: scraped.sourceHost,
        strategy: scraped.strategy,
        pageTitle: scraped.pageTitle,
        warnings: scraped.warnings,
        periodCount: scraped.periods.length,
        occupancyDays: scraped.occupancyByDateKey.size,
        periods: scraped.periods.map((p) => ({
          start: toDateKey(p.startDate),
          end: toDateKey(p.endDate),
          nightlyPrice: p.nightlyPrice,
          currency: p.nightlyPriceCurrency,
          minStayNights: p.minStayNights,
          damageDeposit: p.damageDeposit,
        })),
        sampleBooked: [...scraped.occupancyByDateKey.entries()]
          .filter(([, s]) => s === "BOOKED")
          .slice(0, 8)
          .map(([d]) => d),
      },
      null,
      2
    )
  );

  if (villaId) {
    const result = await importVillaPeriodsFromExternalPage(villaId, url, {
      dryRun: !write,
    });
    console.log(
      write ? "WRITE result:" : "DRY-RUN import result:",
      result
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
