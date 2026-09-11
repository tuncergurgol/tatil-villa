/**
 * Villa Zoray 1 — villaekstra.com Link 1 (takvim + fiyat).
 *
 *   npx tsx scripts/sync-villa-zoray-1-villaekstra.ts --list
 *   npx tsx scripts/sync-villa-zoray-1-villaekstra.ts --dry-run
 *   npx tsx scripts/sync-villa-zoray-1-villaekstra.ts
 */
import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const URL = "https://www.villaekstra.com/villa-zoray-1";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const listOnly = process.argv.includes("--list");

  const candidates = await prisma.villa.findMany({
    where: {
      OR: [
        { name: { contains: "Zoray", mode: "insensitive" } },
        { slug: { contains: "zoray", mode: "insensitive" } },
        { documentNo: { contains: "HI-00967", mode: "insensitive" } },
        { documentNo: { contains: "00967", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      documentNo: true,
      externalSyncUrl1: true,
    },
    orderBy: [{ villaId: "asc" }],
  });

  console.log("Aday villalar:");
  for (const row of candidates) {
    console.log(
      `- ${row.villaId ?? "-"} | ${row.name} | ${row.slug} | belge=${row.documentNo || "-"} | link1=${row.externalSyncUrl1 || "(boş)"}`
    );
  }

  if (listOnly) return;

  const villa =
    candidates.find((row) => row.slug.toLowerCase() === "villa-zoray-1") ??
    candidates.find((row) => row.slug.toLowerCase() === "villa-zoray") ??
    candidates.find((row) => {
      const name = row.name.toLowerCase();
      return name.includes("zoray") && name.includes("1");
    }) ??
    candidates.find((row) => row.name.toLowerCase().includes("zoray"));

  if (!villa) {
    throw new Error(
      "Villa Zoray 1 bulunamadı — önce villayı panele ekleyin, sonra --list ile kontrol edin"
    );
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
