import { prisma } from "../lib/db";
import { syncVillaExternalLinkSlot } from "../lib/villa-external-sync";

async function main() {
  const villa = await prisma.villa.findFirst({
    where: { villaId: 1354 },
    select: { id: true, name: true, externalSyncUrl1: true },
  });
  if (!villa) {
    console.log("Villa 1354 bulunamadı");
    return;
  }
  console.log("Retry:", villa.name, villa.externalSyncUrl1);
  const result = await syncVillaExternalLinkSlot(villa.id, 1);
  console.log(result.ok ? "OK" : "FAIL", result.message);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
