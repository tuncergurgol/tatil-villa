/**
 * Hepsivilla / Elitvillam linklerini tek seferlik yeniden çeker (inout → BOOKED+checkIn).
 * Slot rollerinden bağımsız tam takvim+fiyat aktarımı yapar (onarım).
 * Çalıştır: npx tsx scripts/resync-hepsivilla-inout.ts [--dry-run] [--limit=N]
 */
import { PrismaClient } from "@prisma/client";
import { importVillaPeriodsFromExternalPage } from "../lib/external-villa-page-import-runner";
import type { ExternalSyncSlot } from "../lib/villa-external-sync";

const prisma = new PrismaClient();

function isTargetUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return u.includes("hepsivilla") || u.includes("elitvillam");
}

async function markSlot(
  villaId: string,
  slot: ExternalSyncSlot,
  message: string
) {
  const syncedAtField =
    slot === 1
      ? "externalSyncLastSyncedAt1"
      : slot === 2
        ? "externalSyncLastSyncedAt2"
        : "externalSyncLastSyncedAt3";
  const messageField =
    slot === 1
      ? "externalSyncLastMessage1"
      : slot === 2
        ? "externalSyncLastMessage2"
        : "externalSyncLastMessage3";
  await prisma.villa.update({
    where: { id: villaId },
    data: {
      [syncedAtField]: new Date(),
      [messageField]: message,
    },
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

  const villas = await prisma.villa.findMany({
    where: {
      OR: [
        { externalSyncUrl1: { contains: "hepsivilla", mode: "insensitive" } },
        { externalSyncUrl2: { contains: "hepsivilla", mode: "insensitive" } },
        { externalSyncUrl3: { contains: "hepsivilla", mode: "insensitive" } },
        { externalSyncUrl1: { contains: "elitvillam", mode: "insensitive" } },
        { externalSyncUrl2: { contains: "elitvillam", mode: "insensitive" } },
        { externalSyncUrl3: { contains: "elitvillam", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      externalSyncUrl1: true,
      externalSyncUrl2: true,
      externalSyncUrl3: true,
    },
    orderBy: { villaId: "asc" },
  });

  type Job = {
    villaDbId: string;
    villaId: number | null;
    name: string;
    slot: ExternalSyncSlot;
    url: string;
  };
  const jobs: Job[] = [];
  for (const v of villas) {
    const slots: Array<[ExternalSyncSlot, string]> = [
      [1, v.externalSyncUrl1],
      [2, v.externalSyncUrl2],
      [3, v.externalSyncUrl3],
    ];
    for (const [slot, url] of slots) {
      if (isTargetUrl(url)) {
        jobs.push({
          villaDbId: v.id,
          villaId: v.villaId,
          name: v.name,
          slot,
          url: url.trim(),
        });
      }
    }
  }

  const selected = Number.isFinite(limit) ? jobs.slice(0, limit) : jobs;
  console.log(
    `Toplam ${jobs.length} link, çalışacak: ${selected.length}${dryRun ? " (dry-run)" : ""}`
  );

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < selected.length; i++) {
    const job = selected[i]!;
    const label = `[${i + 1}/${selected.length}] #${job.villaId} ${job.name} Link${job.slot}`;
    if (dryRun) {
      console.log(`${label}: ${job.url}`);
      continue;
    }
    try {
      const result = await importVillaPeriodsFromExternalPage(
        job.villaDbId,
        job.url,
        { syncMode: "calendar_and_price" }
      );
      const message = `${result.sourceHost} (${result.strategy}): ${result.periodCount} periyot, ${result.dayCount} gün (${result.bookedDays} dolu, ${result.optionDays} opsiyon) [inout onarım]`;
      await markSlot(job.villaDbId, job.slot, message);
      ok += 1;
      console.log(`${label}: OK — ${message}`);
    } catch (error) {
      fail += 1;
      const message =
        error instanceof Error ? error.message : String(error);
      await markSlot(job.villaDbId, job.slot, `HATA: ${message}`).catch(
        () => undefined
      );
      console.log(`${label}: FAIL — ${message}`);
    }
  }

  if (!dryRun) {
    console.log(`Bitti: ok=${ok} fail=${fail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
