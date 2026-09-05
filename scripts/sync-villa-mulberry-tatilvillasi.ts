import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const URL =
  "https://www.tatilvillasi.com.tr/villalar/mulberry-collection-violet";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const listOnly = process.argv.includes("--list");

  const candidates = await prisma.villa.findMany({
    where: {
      OR: [
        {
          name: {
            equals: "Mulberry Collection Violet",
            mode: "insensitive",
          },
        },
        { slug: { equals: "mulberry-collection-violet", mode: "insensitive" } },
        { slug: { contains: "mulberry-collection-violet" } },
        {
          name: { contains: "Mulberry Collection Violet", mode: "insensitive" },
        },
        { documentNo: "07-2815" },
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
    candidates.find((row) => row.slug === "mulberry-collection-violet") ??
    candidates.find((row) =>
      /mulberry-collection-violet/i.test(row.slug)
    ) ??
    candidates.find(
      (row) => row.name.toLowerCase() === "mulberry collection violet"
    ) ??
    candidates.find((row) => row.documentNo === "07-2815");

  if (!villa) {
    throw new Error(
      "Mulberry Collection Violet bulunamadı — --list ile adayları kontrol edin"
    );
  }

  const wrong = await prisma.villa.findFirst({
    where: {
      externalSyncUrl1: URL,
      NOT: { id: villa.id },
    },
    select: { id: true, villaId: true, name: true, slug: true },
  });

  if (wrong) {
    console.log(
      `\nYanlış eşleşme temizleniyor: ${wrong.villaId} ${wrong.name} (${wrong.slug})`
    );
    if (!dryRun) {
      await setVillaExternalSyncUrl(wrong.id, 1, "");
    }
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
