import { prisma } from "../lib/db";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

async function main() {
  const villa = await prisma.villa.findFirst({
    where: { villaId: 1312 },
    select: { id: true, name: true, externalSyncUrl1: true },
  });
  if (!villa) {
    console.log("Villa 1312 bulunamadı");
    return;
  }

  const url = "https://www.tatilpremium.com/tr/villa-tepe";
  console.log(`${villa.name}: ${villa.externalSyncUrl1 || "(boş)"} -> ${url}`);
  await setVillaExternalSyncUrl(villa.id, 1, url);
  const result = await syncVillaExternalLinkSlot(villa.id, 1);
  console.log(result.ok ? "OK" : "FAIL", result.message);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
