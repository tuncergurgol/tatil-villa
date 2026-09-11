/**
 * Villavakti takvim (api.php villa_dates) smoke.
 *
 *   npx tsx scripts/smoke-villavakti-calendar.ts
 */
import assert from "node:assert/strict";
import {
  parseVillavaktiDatesResponse,
  scrapeExternalVillaPage,
} from "../lib/external-villa-page-scrape";

const sample =
  "2026-7-1,2026-8-4|2026-7-5,2026-8-10|2026-7-2,2026-7-3,2026-7-4,2026-8-5,2026-8-6|||2026-9-1,2026-9-2|";
const occ = parseVillavaktiDatesResponse(sample);
assert.equal(occ.get("2026-07-01"), "BOOKED");
assert.equal(occ.get("2026-07-02"), "BOOKED");
assert.equal(occ.get("2026-07-03"), "BOOKED");
assert.equal(occ.get("2026-07-04"), "BOOKED");
assert.equal(occ.has("2026-07-05"), false, "checkout morning stays empty");
assert.equal(occ.get("2026-09-01"), "OPTION");
assert.equal(occ.get("2026-09-02"), "OPTION");

async function live() {
  const scraped = await scrapeExternalVillaPage(
    "https://www.villavakti.com/tr/villa-emir-gocek"
  );
  assert.equal(scraped.strategy, "villavakti");
  assert.ok(scraped.periods.length > 0, "periods expected");
  assert.ok(
    scraped.occupancyByDateKey.size > 0,
    `occupancy expected, got 0; warnings=${scraped.warnings.join(" | ")}`
  );
  const booked2026 = [...scraped.occupancyByDateKey.entries()].filter(
    ([key, status]) => key.startsWith("2026") && status === "BOOKED"
  );
  assert.ok(booked2026.length > 0, "2026 booked days expected");
  console.log("smoke-villavakti-calendar: OK", {
    periods: scraped.periods.length,
    occupancyDays: scraped.occupancyByDateKey.size,
    booked2026: booked2026.length,
    warnings: scraped.warnings,
  });
}

live().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
