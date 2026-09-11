/**
 * Villa Mavi Ada — ovillam.com Link 1
 *   npx tsx scripts/sync-villa-mavi-ada-ovillam.ts --list
 *   npx tsx scripts/sync-villa-mavi-ada-ovillam.ts --dry-run
 *   npx tsx scripts/sync-villa-mavi-ada-ovillam.ts
 */
import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const URL = "https://www.ovillam.com/Villa-Mavi-Ada";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const listOnly = process.argv.includes("--list");

  const candidates = await prisma.villa.findMany({
    where: {
      OR: [
        { name: { contains: "Mavi Ada", mode: "insensitive" } },
        { slug: { equals: "villa-mavi-ada", mode: "insensitive" } },
        { villaId: 1350 },
      ],
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      externalSyncUrl1: true,
      externalSyncLastMessage1: true,
    },
    orderBy: [{ villaId: "asc" }],
  });

  console.log("Aday villalar:");
  for (const row of candidates) {
    console.log(
      `- ${row.villaId ?? "-"} | ${row.name} | ${row.slug} | link1=${row.externalSyncUrl1 || "(boş)"} | msg=${row.externalSyncLastMessage1 || "-"}`
    );
  }

  if (listOnly) return;

  const villa =
    candidates.find((row) => row.villaId === 1350) ??
    candidates.find((row) => row.slug.toLowerCase() === "villa-mavi-ada") ??
    candidates[0];

  if (!villa) {
    throw new Error("Villa Mavi Ada bulunamadı");
  }

  console.log(
    `\nHedef villa: ${villa.villaId ?? "-"} ${villa.name} (${villa.slug})\nYeni link1: ${URL}`
  );

  if (dryRun) {
    console.log("Dry-run — değişiklik yapılmadı");
    return;
  }

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
