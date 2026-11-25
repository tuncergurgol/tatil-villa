/**
 * Perfetto Villa Kaya — villamgayrimenkul.com Link 1 fiyat+takvim senkronu.
 *
 *   npx tsx scripts/sync-villa-perfetto-kaya-villamgayrimenkul.ts --list
 *   npx tsx scripts/sync-villa-perfetto-kaya-villamgayrimenkul.ts --dry-run
 *   npx tsx scripts/sync-villa-perfetto-kaya-villamgayrimenkul.ts
 */
import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const URL = "https://www.villamgayrimenkul.com/perfetto-villa-kaya";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const listOnly = process.argv.includes("--list");

  const candidates = await prisma.villa.findMany({
    where: {
      OR: [
        { villaId: 1976 },
        { documentNo: { contains: "48-6105" } },
        { name: { contains: "Perfetto", mode: "insensitive" } },
        { slug: { contains: "perfetto", mode: "insensitive" } },
        { name: { contains: "Eterna Kayak", mode: "insensitive" } },
        { slug: { equals: "villa-eterna-kayakoy", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      documentNo: true,
      externalSyncUrl1: true,
      externalSyncLastMessage1: true,
    },
    orderBy: [{ villaId: "asc" }],
  });

  console.log("Aday villalar:");
  for (const row of candidates) {
    console.log(
      `- ${row.villaId ?? "-"} | ${row.name} | ${row.slug} | belge=${row.documentNo || "-"} | link1=${row.externalSyncUrl1 || "(boş)"} | msg=${row.externalSyncLastMessage1 || "-"}`
    );
  }

  if (listOnly) return;

  const villa =
    candidates.find((row) => row.villaId === 1976) ??
    candidates.find((row) => (row.documentNo || "").includes("48-6105")) ??
    candidates.find((row) => /eterna|perfetto/i.test(`${row.name} ${row.slug}`));

  if (!villa) {
    throw new Error("Perfetto Villa Kaya bulunamadı");
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
