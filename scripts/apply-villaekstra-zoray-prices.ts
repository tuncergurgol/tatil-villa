/**
 * Villa Ekstra Zoray 1/2 PriceList (api2, tarayıcıdan alınan gerçek satırlar)
 * Villa Pegasus + Villa Elenor sahte 2026-2027 düz fiyatlarını düzeltir.
 *
 *   npx tsx scripts/apply-villaekstra-zoray-prices.ts
 */
import { prisma } from "../lib/db";
import {
  parseVillavillamAvailability,
  parseVillavillamPriceList,
} from "../lib/external-villa-page-scrape";
import { persistVillaPricePeriods } from "../lib/villa-period-persist";
import { reapplyConfirmedBookingReservedOccupancy } from "../lib/villa-occupancy-service";

const PRICE_ROWS = [
  {
    Symbol: "₺",
    dailyPrice: 20000,
    fiyat: 620000,
    subTitle: "Minumum 3 gece konaklama",
    info: "7 Gece altındaki kiralamalarda ekstra 5000₺ kısa konaklama ücreti alınmaktadır.",
    tarih1: "2026-08-01",
    tarih2: "2026-08-31",
  },
  {
    Symbol: "₺",
    dailyPrice: 17500,
    fiyat: 262500,
    subTitle: "Minumum 3 gece konaklama",
    info: "7 Gece altındaki kiralamalarda ekstra 5000₺ kısa konaklama ücreti alınmaktadır.",
    tarih1: "2026-09-01",
    tarih2: "2026-09-15",
  },
  {
    Symbol: "₺",
    dailyPrice: 13750,
    fiyat: 206250,
    subTitle: "Minumum 3 gece konaklama",
    info: "7 Gece altındaki kiralamalarda ekstra 5000₺ kısa konaklama ücreti alınmaktadır.",
    tarih1: "2026-09-16",
    tarih2: "2026-09-30",
  },
  {
    Symbol: "₺",
    dailyPrice: 11250,
    fiyat: 348750,
    subTitle: "Minumum 3 gece konaklama",
    info: "7 Gece altındaki kiralamalarda ekstra 5000₺ kısa konaklama ücreti alınmaktadır.",
    tarih1: "2026-10-01",
    tarih2: "2026-10-31",
  },
];

const VILLAS = [
  {
    slug: "villa-elenor",
    availability: {
      Symbol: "₺",
      data: {
        doluGirisler: ["2026-08-20", "2026-08-30", "2026-09-21"],
        doluGunler: [
          "2026-08-21",
          "2026-08-22",
          "2026-08-23",
          "2026-08-24",
          "2026-08-25",
          "2026-08-26",
          "2026-08-27",
          "2026-08-28",
          "2026-08-29",
          "2026-08-31",
          "2026-09-01",
          "2026-09-02",
          "2026-09-03",
          "2026-09-04",
          "2026-09-05",
          "2026-09-06",
          "2026-09-22",
          "2026-09-23",
          "2026-09-24",
        ],
        odemeGunler: [],
      },
    },
  },
  {
    slug: "villa-pegasus",
    availability: {
      Symbol: "₺",
      data: {
        doluGirisler: ["2026-08-22", "2026-09-08"],
        doluGunler: [
          "2026-08-23",
          "2026-08-24",
          "2026-08-25",
          "2026-08-26",
          "2026-08-27",
          "2026-08-28",
          "2026-09-09",
          "2026-09-10",
          "2026-09-11",
        ],
        odemeGunler: [],
      },
    },
  },
] as const;

async function main() {
  const periods = parseVillavillamPriceList(PRICE_ROWS, "TL", 2500);
  if (periods.length !== 4) {
    throw new Error(`Beklenen 4 dönem, gelen ${periods.length}`);
  }
  if (periods.some((p) => p.minStayNights !== 3)) {
    throw new Error("Minimum konaklama 3 gece olarak okunamadı");
  }

  for (const item of VILLAS) {
    const villa = await prisma.villa.findUnique({
      where: { slug: item.slug },
      select: { id: true, name: true, slug: true },
    });
    if (!villa) throw new Error(`Villa bulunamadı: ${item.slug}`);

    const availability = parseVillavillamAvailability(item.availability);
    await persistVillaPricePeriods({
      villaId: villa.id,
      periods,
      occupancyByDateKey: availability.occupancyByDateKey,
    });
    await reapplyConfirmedBookingReservedOccupancy(villa.id);

    const booked = [...availability.occupancyByDateKey.values()].filter(
      (status) => status === "BOOKED"
    ).length;
    console.log(
      `OK ${villa.name} (${villa.slug}): ${periods.length} dönem, ${booked} dolu gün`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
