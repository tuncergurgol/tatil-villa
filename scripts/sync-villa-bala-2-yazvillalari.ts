import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";
import { importVillaPeriodsWithFallback } from "../lib/villa-period-import-with-fallback";
import { dbDateToDateKey } from "../lib/villa-period-calendar";

const YAZVILLALARI_URL = "https://www.yazvillalari.com/Villa-Bala-duo";
const KASKAVILLA_URL = "https://kaskavilla.com/kiralik-villa/villa-bala-2";

async function main() {
  const villa = await prisma.villa.findFirst({
    where: { slug: "villa-bala-2" },
    select: { id: true, villaId: true, name: true },
  });
  if (!villa) throw new Error("Villa Bala 2 bulunamadı");

  console.log("Sync:", villa.villaId, villa.name);
  await setVillaExternalSyncUrl(villa.id, 1, YAZVILLALARI_URL);
  await setVillaExternalSyncUrl(villa.id, 2, KASKAVILLA_URL);
  await sleep(800);

  const prices = await importVillaPeriodsWithFallback(villa.id);
  console.log(
    "Fiyat:",
    prices.sourceLabel,
    prices.periodCount,
    "periyot",
    prices.dayCount,
    "gün"
  );

  await sleep(800);
  const calendar = await syncVillaExternalLinkSlot(villa.id, 1);
  console.log(calendar.ok ? "Takvim OK" : "Takvim FAIL", calendar.message);

  const augDays = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId: villa.id,
      date: {
        gte: new Date("2026-08-10T00:00:00.000Z"),
        lte: new Date("2026-08-20T00:00:00.000Z"),
      },
    },
    select: { date: true, occupancyStatus: true, nightlyPrice: true },
    orderBy: { date: "asc" },
  });
  console.log(
    "DB Ağu 11-20:",
    augDays
      .map(
        (d) =>
          `${dbDateToDateKey(d.date)}=${d.occupancyStatus}/${d.nightlyPrice}`
      )
      .join(", ")
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
