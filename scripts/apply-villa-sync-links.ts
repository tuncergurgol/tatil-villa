/**
 * Belirli villalara harici sync linki yazar ve hemen günceller.
 *
 *   npx tsx scripts/apply-villa-sync-links.ts
 *   npx tsx scripts/apply-villa-sync-links.ts --dry-run
 */
import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const LINKS = [
  {
    villaId: 1354,
    url: "https://www.villakilavuzu.com/villa-elcin-",
  },
  {
    villaId: 1225,
    url: "https://tatilkentim.com/villa-arna-elit-demre",
  },
  {
    villaId: 1312,
    url: "https://www.tatilpremium.com/tr/villa-tepe",
  },
] as const;

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  for (const item of LINKS) {
    const villa = await prisma.villa.findFirst({
      where: { villaId: item.villaId },
      select: { id: true, villaId: true, name: true, externalSyncUrl1: true },
    });

    if (!villa) {
      console.log(`SKIP villa ${item.villaId} bulunamadı`);
      continue;
    }

    console.log(
      `\n=== ${villa.villaId} ${villa.name} ===\n  eski: ${villa.externalSyncUrl1 || "(boş)"}\n  yeni: ${item.url}`
    );

    if (dryRun) continue;

    const saved = await setVillaExternalSyncUrl(villa.id, 1, item.url);
    if (!saved.ok) {
      console.log(`FAIL link kaydı: ${saved.message}`);
      continue;
    }

    const result = await syncVillaExternalLinkSlot(villa.id, 1, {
      urlOverride: item.url,
    });
    console.log(result.ok ? "OK" : "FAIL", result.message);
    await sleep(1200);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
