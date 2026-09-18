/**
 * egetatilevleri.com.tr Villa Anka Kördere scrape smoke.
 *
 *   npx tsx scripts/smoke-egetatilevleri-anka.ts
 */
import { scrapeExternalVillaListing } from "../lib/external-villa-listing";
import { scrapeExternalVillaPage } from "../lib/external-villa-page-scrape";
import { toDateKey } from "../lib/villa-period-calendar";

const URL =
  "https://egetatilevleri.com.tr/kas-kiralik-villa/villa-anka-kordere";

async function main() {
  const listing = await scrapeExternalVillaListing(URL);
  const scraped = await scrapeExternalVillaPage(URL);

  console.log(
    JSON.stringify(
      {
        listing: {
          name: listing.name,
          location: listing.locationLabel,
          district: listing.districtName,
          guests: listing.guests,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          documentNo: listing.documentNo,
          coords: { lat: listing.latitude, lng: listing.longitude },
          images: listing.imageUrls.length,
          distances: listing.distances,
          pool: listing.pool,
          amenities: listing.amenityLabels,
          facilities: listing.facilityLabels,
          allowPets: listing.allowPets,
          allowEvents: listing.allowEvents,
          allowSmoking: listing.allowSmoking,
          descLen: listing.descriptionHtml.length,
        },
        scrape: {
          strategy: scraped.strategy,
          warnings: scraped.warnings,
          periodCount: scraped.periods.length,
          occupancyDays: scraped.occupancyByDateKey.size,
          checkIns: [...(scraped.checkInDateKeys ?? [])].slice(0, 8),
          periods: scraped.periods.map((period) => ({
            start: toDateKey(period.startDate),
            end: toDateKey(period.endDate),
            nightly: period.nightlyPrice,
            weekly: period.weeklyPrice,
            minStay: period.minStayNights,
            cleaningFee: period.cleaningFee,
            cleaningDayCount: period.cleaningDayCount,
            indoorHeat: period.poolHeatingIndoorFee,
          })),
          sampleBooked: [...scraped.occupancyByDateKey.entries()]
            .filter(([, status]) => status === "BOOKED")
            .slice(0, 10)
            .map(([date]) => date),
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
