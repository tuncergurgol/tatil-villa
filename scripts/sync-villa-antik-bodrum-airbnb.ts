import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const URL =
  "https://www.airbnb.com.tr/rooms/28117950?source_impression_id=p3_1786379062_P306FkDCuNXW6AmL";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const listOnly = process.argv.includes("--list");

  const candidates = await prisma.villa.findMany({
    where: {
      OR: [
        { name: { equals: "Villa Antik Bodrum", mode: "insensitive" } },
        { slug: { equals: "villa-antik-bodrum", mode: "insensitive" } },
        { name: { contains: "Antik Bodrum", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      externalSyncUrl1: true,
      externalSyncUrl2: true,
    },
    orderBy: [{ villaId: "asc" }],
  });

  console.log("Aday villalar:");
  for (const row of candidates) {
    console.log(
      `- ${row.villaId ?? "-"} | ${row.name} | ${row.slug} | link1=${row.externalSyncUrl1 || "(boş)"} | link2=${row.externalSyncUrl2 || "(boş)"}`
    );
  }

  if (listOnly) return;

  const villa =
    candidates.find((row) => row.slug === "villa-antik-bodrum") ??
    candidates.find((row) =>
      row.name.toLowerCase().includes("antik bodrum")
    );

  if (!villa) {
    throw new Error(
      "Villa Antik Bodrum bulunamadı — --list ile adayları kontrol edin"
    );
  }

  const wrong = await prisma.villa.findFirst({
    where: {
      OR: [{ externalSyncUrl1: URL }, { externalSyncUrl2: URL }],
      NOT: { id: villa.id },
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      externalSyncUrl1: true,
      externalSyncUrl2: true,
    },
  });

  if (wrong) {
    console.log(
      `\nYanlış eşleşme temizleniyor: ${wrong.villaId} ${wrong.name} (${wrong.slug})`
    );
    if (!dryRun) {
      if (wrong.externalSyncUrl1 === URL) {
        await setVillaExternalSyncUrl(wrong.id, 1, "");
      }
      if (wrong.externalSyncUrl2 === URL) {
        await setVillaExternalSyncUrl(wrong.id, 2, "");
      }
    }
  }

  console.log(
    `\nHedef villa: ${villa.villaId ?? "-"} ${villa.name} (${villa.slug})\nYeni link2: ${URL}`
  );

  if (dryRun) {
    console.log("Dry-run — değişiklik yapılmadı");
    return;
  }

  // Airbnb takvim → Link 2; Link 1 boş bırakılır (fiyat sayfası için)
  if (villa.externalSyncUrl1?.includes("airbnb.")) {
    await setVillaExternalSyncUrl(villa.id, 1, "");
  }
  const saved = await setVillaExternalSyncUrl(villa.id, 2, URL);
  if (!saved.ok) throw new Error(saved.message);

  await sleep(800);
  const result = await syncVillaExternalLinkSlot(villa.id, 2, {
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
