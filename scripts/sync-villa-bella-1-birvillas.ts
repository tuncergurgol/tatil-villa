/**
 * Villa Bella 1 — birvillas.com.tr Link 1 (takvim + fiyat).
 *
 *   npx tsx scripts/sync-villa-bella-1-birvillas.ts
 *   npx tsx scripts/sync-villa-bella-1-birvillas.ts --dry-run
 */
import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const URL =
  "https://www.birvillas.com.tr/villa/tc97shkNcDvOfEPCKSVs/villa-bella-1-orkide-islamlar";
const TARGET_SLUG = "villa-bella-1";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const villa = await prisma.villa.findFirst({
    where: {
      OR: [
        { slug: TARGET_SLUG },
        { name: { equals: "Villa Bella 1", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      externalSyncUrl1: true,
      externalSyncLastSyncedAt1: true,
      externalSyncLastMessage1: true,
    },
    orderBy: [{ villaId: "asc" }],
  });

  if (!villa) {
    throw new Error("Villa Bella 1 bulunamadı");
  }

  console.log(
    JSON.stringify(
      {
        villa: `${villa.name} (#${villa.villaId})`,
        slug: villa.slug,
        currentLink1: villa.externalSyncUrl1 || null,
        lastSyncAt: villa.externalSyncLastSyncedAt1,
        lastMessage: villa.externalSyncLastMessage1 || null,
        newLink1: URL,
        dryRun,
      },
      null,
      2
    )
  );

  if (dryRun) return;

  const saved = await setVillaExternalSyncUrl(villa.id, 1, URL);
  if (!saved.ok) throw new Error(saved.message);

  await sleep(800);
  const result = await syncVillaExternalLinkSlot(villa.id, 1, {
    urlOverride: URL,
  });
  console.log(result.ok ? "OK" : "FAIL", result.message);

  const after = await prisma.villa.findUnique({
    where: { id: villa.id },
    select: {
      externalSyncUrl1: true,
      externalSyncLastSyncedAt1: true,
      externalSyncLastMessage1: true,
      _count: { select: { pricePeriodDays: true, pricePeriods: true } },
    },
  });
  console.log(JSON.stringify(after, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
