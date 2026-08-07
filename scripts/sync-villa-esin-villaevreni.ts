/**
 * Villa Esin — villaevreni.com link1 ayarı ve ilk senkron.
 *
 *   npx tsx scripts/sync-villa-esin-villaevreni.ts
 *   npx tsx scripts/sync-villa-esin-villaevreni.ts --dry-run
 */
import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const URL =
  "https://www.villaevreni.com/villa/villa-esin-kalkan-korunakli-kiralik-balayi-tatil-villamiz";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const villa = await prisma.villa.findFirst({
    where: {
      OR: [
        { name: { contains: "Esin", mode: "insensitive" } },
        { slug: { contains: "esin", mode: "insensitive" } },
        { originalName: { contains: "Esin", mode: "insensitive" } },
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

  if (!villa) {
    throw new Error("Villa Esin kaydı bulunamadı");
  }

  console.log(
    `Villa: ${villa.villaId ?? "-"} ${villa.name} (${villa.slug})\nEski link1: ${villa.externalSyncUrl1 || "(boş)"}\nYeni link1: ${URL}`
  );

  if (dryRun) {
    console.log("Dry-run — değişiklik yapılmadı");
    return;
  }

  const saved = await setVillaExternalSyncUrl(villa.id, 1, URL);
  if (!saved.ok) {
    throw new Error(saved.message);
  }

  console.log("Link1 kaydedildi, senkron başlıyor...");
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
