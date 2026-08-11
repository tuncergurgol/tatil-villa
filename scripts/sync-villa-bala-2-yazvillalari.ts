import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";
import { dbDateToDateKey } from "../lib/villa-period-calendar";

const URL = "https://www.yazvillalari.com/Villa-Bala-duo";

async function main() {
  const villa = await prisma.villa.findFirst({
    where: { slug: "villa-bala-2" },
    select: { id: true, villaId: true, name: true },
  });
  if (!villa) throw new Error("Villa Bala 2 bulunamadı");

  console.log("Sync:", villa.villaId, villa.name);
  await setVillaExternalSyncUrl(villa.id, 1, URL);
  await sleep(800);
  const result = await syncVillaExternalLinkSlot(villa.id, 1);
  console.log(result.ok ? "OK" : "FAIL", result.message);

  const days = await prisma.villaPricePeriodDay.findMany({
    where: {
      villaId: villa.id,
      date: {
        gte: new Date("2026-08-10T00:00:00.000Z"),
        lte: new Date("2026-08-20T00:00:00.000Z"),
      },
    },
    select: { date: true, occupancyStatus: true },
    orderBy: { date: "asc" },
  });
  console.log(
    "DB:",
    days.map((d) => `${dbDateToDateKey(d.date)}=${d.occupancyStatus}`).join(", ")
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
