/**
 * Villa Emir (351) üzerine yanlışlıkla yazılan villavakti linkini temizle,
 * Villa Emirhan (villa-emir-gocek) Link 1 takvimini yeniden senkronla.
 *
 *   npx tsx scripts/fix-villa-emirhan-villavakti-sync.ts
 */
import { prisma } from "../lib/db";
import { sleep } from "../lib/tatildeyiz-gallery";
import {
  setVillaExternalSyncUrl,
  syncVillaExternalLinkSlot,
} from "../lib/villa-external-sync";

const URL = "https://www.villavakti.com/tr/villa-emir-gocek";

async function main() {
  const wrong = await prisma.villa.findFirst({
    where: {
      OR: [{ villaId: 351 }, { slug: "villa-emir" }],
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      externalSyncUrl1: true,
    },
  });

  if (
    wrong &&
    (wrong.externalSyncUrl1 || "").includes("villa-emir-gocek")
  ) {
    console.log(
      `Temizleniyor: ${wrong.villaId} ${wrong.name} link1=${wrong.externalSyncUrl1}`
    );
    const cleared = await setVillaExternalSyncUrl(wrong.id, 1, "");
    if (!cleared.ok) throw new Error(cleared.message);
    await sleep(400);
  } else {
    console.log("Villa Emir link1 temizleme gerekmedi");
  }

  const target = await prisma.villa.findFirst({
    where: {
      OR: [
        { villaId: 1400 },
        { slug: "villa-emirhan" },
        { externalSyncUrl1: { contains: "villa-emir-gocek" } },
      ],
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      externalSyncUrl1: true,
    },
  });

  if (!target) throw new Error("Villa Emirhan bulunamadı");

  console.log(
    `Senkron: ${target.villaId} ${target.name} (${target.slug}) → ${URL}`
  );
  const saved = await setVillaExternalSyncUrl(target.id, 1, URL);
  if (!saved.ok) throw new Error(saved.message);
  await sleep(800);

  const result = await syncVillaExternalLinkSlot(target.id, 1, {
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
