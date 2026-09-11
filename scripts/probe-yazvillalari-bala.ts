import { scrapeExternalVillaPage } from "../lib/external-villa-page-scrape";
import { buildDaySnapshotsForPeriod } from "../lib/tatildeyiz-period-import";

const URL = "https://www.yazvillalari.com/Villa-Bala-duo";

async function main() {
  const scraped = await scrapeExternalVillaPage(URL);
  console.log("strategy", scraped.strategy, "host", scraped.sourceHost);
  console.log("warnings", scraped.warnings);
  console.log("periods", scraped.periods.length);

  const augKeys = [...scraped.occupancyByDateKey.entries()]
    .filter(([k]) => k >= "2026-08-08" && k <= "2026-08-22")
    .sort(([a], [b]) => a.localeCompare(b));

  console.log("\noccupancy Aug 8-22:");
  for (const [k, v] of augKeys) console.log(k, v);

  if (scraped.periods.length > 0) {
    const period = scraped.periods.find(
      (p) => p.startDate <= new Date("2026-08-20") && p.endDate >= new Date("2026-08-01")
    );
    if (period) {
      const snaps = buildDaySnapshotsForPeriod(period, scraped.occupancyByDateKey)
        .filter((s) => s.dateKey >= "2026-08-08" && s.dateKey <= "2026-08-22");
      console.log("\nperiod snapshots:");
      for (const s of snaps) console.log(s.dateKey, s.snapshot.occupancyStatus);
    }
  }
}

main().catch(console.error);
