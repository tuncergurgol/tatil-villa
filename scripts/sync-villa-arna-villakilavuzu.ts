import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

/** Villa Kodu 2657 — sayfa 429 olursa entityId ile API fallback */
const URL = "https://www.villakilavuzu.com/villa-arna?entityId=2657";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const listOnly = process.argv.includes("--list");

  const candidates = await prisma.villa.findMany({
    where: {
      OR: [
        { name: { contains: "Arna", mode: "insensitive" } },
        { slug: { contains: "arna", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      externalSyncUrl1: true,
    },
    orderBy: [{ villaId: "asc" }],
  });

  console.log("Aday villalar:");
  for (const row of candidates) {
    console.log(
      `- ${row.villaId ?? "-"} | ${row.name} | ${row.slug} | link1=${row.externalSyncUrl1 || "(boş)"}`
    );
  }

  if (listOnly) return;

  const villa =
    candidates.find((row) => row.slug.toLowerCase() === "villa-arna-demre-1") ??
    candidates.find((row) => row.slug.toLowerCase() === "villa-arna") ??
    candidates.find((row) => {
      const name = row.name.toLowerCase();
      return name.includes("arna") && name.includes("demre") && name.includes("1");
    }) ??
    candidates.find((row) => row.slug.toLowerCase().includes("arna"));

  if (!villa) {
    throw new Error(
      "Villa Arna bulunamadı — --list ile adayları kontrol edin"
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
