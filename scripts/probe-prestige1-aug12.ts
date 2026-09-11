import { prisma } from "../lib/db";
import { scrapeExternalVillaPage } from "../lib/external-villa-page-scrape";
import { toDateKey } from "../lib/villa-period-calendar";

async function main() {
  const villa = await prisma.villa.findFirst({
    where: { slug: "villa-prestige-1-oludeniz" },
    select: {
      id: true,
      villaId: true,
      name: true,
      externalSyncUrl1: true,
      externalSyncUrl2: true,
      externalSyncUrl3: true,
      externalSyncUrl4: true,
    },
  });
  if (!villa) throw new Error("Villa not found");
  console.log("Villa:", villa);

  const days = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId: villa.id,
      date: {
        gte: new Date("2026-08-07T00:00:00.000Z"),
        lte: new Date("2026-08-16T00:00:00.000Z"),
      },
    },
    orderBy: { date: "asc" },
    select: { date: true, occupancyStatus: true, availability: true },
  });
  console.log("\nDB days Aug 7-16:");
  for (const day of days) {
    console.log(toDateKey(day.date), day.occupancyStatus, day.availability);
  }

  const url = villa.externalSyncUrl1 || villa.externalSyncUrl2;
  if (url) {
    console.log("\nScraping:", url);
    const scraped = await scrapeExternalVillaPage(url);
    console.log("strategy:", scraped.strategy);
    for (let i = 7; i <= 16; i++) {
      const key = `2026-08-${String(i).padStart(2, "0")}`;
      console.log(key, scraped.occupancyByDateKey.get(key) ?? "EMPTY");
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
