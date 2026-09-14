/**
 * birvillas scraper smoke — Villa Bella 1 örneği.
 *
 *   npx tsx scripts/smoke-birvillas-scrape.ts
 */
import assert from "node:assert/strict";
import { scrapeBirvillasFromHtml } from "../lib/external-villa-page-scrape";

const URL =
  "https://www.birvillas.com.tr/villa/tc97shkNcDvOfEPCKSVs/villa-bella-1-orkide-islamlar";

async function main() {
  const html = await (
    await fetch(URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      cache: "no-store",
    })
  ).text();

  const warnings: string[] = [];
  const scraped = scrapeBirvillasFromHtml(URL, html, warnings);
  assert.ok(scraped, "birvillas scrape null döndü");
  assert.equal(scraped.strategy, "birvillas");
  assert.ok(scraped.periods.length >= 1, "period yok");
  assert.ok(scraped.occupancyByDateKey.size >= 1, "occupancy yok");

  console.log(
    JSON.stringify(
      {
        strategy: scraped.strategy,
        periodCount: scraped.periods.length,
        bookedDays: [...scraped.occupancyByDateKey.values()].filter(
          (v) => v === "BOOKED"
        ).length,
        firstPeriod: {
          start: scraped.periods[0]!.startDate.toISOString().slice(0, 10),
          end: scraped.periods[0]!.endDate.toISOString().slice(0, 10),
          nightly: scraped.periods[0]!.nightlyPrice,
          cleaning: scraped.periods[0]!.cleaningFee,
          deposit: scraped.periods[0]!.damageDeposit,
          minStay: scraped.periods[0]!.minStayNights,
        },
        warnings,
      },
      null,
      2
    )
  );
  console.log("smoke-birvillas-scrape: OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
