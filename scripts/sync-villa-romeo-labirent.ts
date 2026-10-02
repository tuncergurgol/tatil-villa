/**
 * Villa Romeo (2237) Link 1 — labirentfethiye.com fiyat + takvim.
 *
 *   npx tsx scripts/sync-villa-romeo-labirent.ts
 */
import { prisma } from "../lib/db";
import { syncVillaExternalLinkSlot } from "../lib/villa-external-sync";

const URL = "https://labirentfethiye.com/villalar/villa-romeo";

async function main() {
  const villa = await prisma.villa.findFirst({
    where: { villaId: 2237 },
    select: { id: true, name: true, externalSyncUrl1: true },
  });
  if (!villa) {
    console.log("Villa 2237 bulunamadı");
    return;
  }

  console.log(`${villa.name}: ${villa.externalSyncUrl1 || "(boş)"}`);
  if (villa.externalSyncUrl1 !== URL) {
    console.log(`Link 1 beklenen adres değil: ${URL}`);
  }

  const result = await syncVillaExternalLinkSlot(villa.id, 1);
  console.log(result.ok ? "OK" : "FAIL", result.message);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
