import { scrapeExternalVillaPage } from "@/lib/external-villa-page-scrape";

async function main() {
  const result = await scrapeExternalVillaPage(
    "https://www.villajoye.com/ilanlar/villa-oliva-nera/"
  );
  console.log({
    strategy: result.strategy,
    periods: result.periods.map((period) => ({
      start: period.startDate.toISOString().slice(0, 10),
      end: period.endDate.toISOString().slice(0, 10),
      price: period.nightlyPrice,
      min: period.minStayNights,
      deposit: period.damageDeposit,
    })),
    bookedDays: [...result.occupancyByDateKey.values()].filter(
      (value) => value === "BOOKED"
    ).length,
    warnings: result.warnings,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
