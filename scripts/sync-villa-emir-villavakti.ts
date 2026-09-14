/**
 * Villa Emir Göcek — villavakti Link 1 fiyat+takvim senkronu.
 *
 *   npx tsx scripts/sync-villa-emir-villavakti.ts --list
 *   npx tsx scripts/sync-villa-emir-villavakti.ts --dry-run
 *   npx tsx scripts/sync-villa-emir-villavakti.ts
 */
import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const URL = "https://www.villavakti.com/tr/villa-emir-gocek";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const listOnly = process.argv.includes("--list");

  const candidates = await prisma.villa.findMany({
    where: {
      OR: [
        { name: { contains: "Emir", mode: "insensitive" } },
        { slug: { contains: "emir", mode: "insensitive" } },
        { externalSyncUrl1: { contains: "villavakti", mode: "insensitive" } },
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
    candidates.find((row) =>
      (row.externalSyncUrl1 || "").includes("villa-emir-gocek")
    ) ??
    candidates.find((row) =>
      /emir.*gocek|gocek.*emir/i.test(`${row.slug} ${row.name}`)
    ) ??
    candidates.find((row) => /emirhan/i.test(`${row.slug} ${row.name}`));

  if (!villa) {
    throw new Error(
      "Villa Emir Göcek / Emirhan bulunamadı — --list ile adayları kontrol edin"
    );
  }

  console.log(
    `\nHedef villa: ${villa.villaId ?? "-"} ${villa.name} (${villa.slug})\nLink1: ${URL}`
  );

  if (dryRun) {
    console.log("Dry-run — değişiklik yapılmadı");
    return;
  }

  const current = (villa.externalSyncUrl1 || "").trim();
  if (current !== URL) {
    const saved = await setVillaExternalSyncUrl(villa.id, 1, URL);
    if (!saved.ok) throw new Error(saved.message);
    await sleep(800);
  }

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
