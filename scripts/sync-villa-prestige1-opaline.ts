import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const URL = "https://www.villavillam.com.tr/villa-opaline";

async function main() {
  const villa = await prisma.villa.findFirst({
    where: { slug: "villa-prestige-1-oludeniz" },
    select: { id: true, villaId: true, name: true, slug: true },
  });
  if (!villa) throw new Error("Villa bulunamadı");

  console.log(`Hedef: ${villa.villaId} ${villa.name}`);
  const saved = await setVillaExternalSyncUrl(villa.id, 1, URL);
  if (!saved.ok) throw new Error(saved.message);

  await sleep(800);
  const result = await syncVillaExternalLinkSlot(villa.id, 1, {
    urlOverride: URL,
  });
  console.log(result.ok ? "OK" : "FAIL", result.message);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
