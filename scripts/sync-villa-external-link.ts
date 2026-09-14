/**
 * Villa Akbulut 4 (villaId 2134) — Risus link güncelle + Link 1 sync.
 *
 *   npx tsx scripts/sync-villa-external-link.ts --db-villa-id=2134 --slot=1 --url=https://...
 */
import { prisma } from "../lib/db";
import { syncVillaExternalLinkSlot } from "../lib/villa-external-sync";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  const dbVillaId = Number(argValue("db-villa-id"));
  const slot = Number(argValue("slot") ?? "1");
  const url = argValue("url")?.trim();

  if (!Number.isFinite(dbVillaId) || dbVillaId <= 0) {
    throw new Error("--db-villa-id gerekli");
  }
  if (![1, 2, 3, 4].includes(slot)) {
    throw new Error("--slot 1-4 olmalı");
  }
  if (!url) {
    throw new Error("--url gerekli");
  }

  const field = `externalSyncUrl${slot}` as
    | "externalSyncUrl1"
    | "externalSyncUrl2"
    | "externalSyncUrl3"
    | "externalSyncUrl4";

  const villa = await prisma.villa.findFirst({
    where: { villaId: dbVillaId },
    select: { id: true, name: true, villaId: true, externalSyncUrl1: true },
  });

  if (!villa) {
    throw new Error(`Villa bulunamadı (villaId=${dbVillaId})`);
  }

  await prisma.villa.update({
    where: { id: villa.id },
    data: { [field]: url },
  });

  console.log(`Link ${slot} güncellendi: ${villa.name} (${villa.villaId}) → ${url}`);

  const result = await syncVillaExternalLinkSlot(
    villa.id,
    slot as 1 | 2 | 3 | 4
  );
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
