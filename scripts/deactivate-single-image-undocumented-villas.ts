/**
 * Tek galeri görseli olan + belgesiz villaları:
 * - Yayın durumu pasif (active=false)
 * - Teklif alanında görünmez (showInOffer=false)
 *
 *   npx tsx scripts/deactivate-single-image-undocumented-villas.ts
 *   npx tsx scripts/deactivate-single-image-undocumented-villas.ts --dry-run
 *   npx tsx scripts/deactivate-single-image-undocumented-villas.ts --offer-only
 */
import { prisma } from "../lib/db";
import { hasVillaTourismDocument } from "../lib/villa-document-types";
import { getVillaGalleryImages } from "../lib/villa-gallery";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const offerOnly = process.argv.includes("--offer-only");

  const villas = await prisma.villa.findMany({
    select: {
      id: true,
      villaId: true,
      name: true,
      active: true,
      showInOffer: true,
      image: true,
      images: true,
      documentNo: true,
      documentType: true,
    },
  });

  const targets = villas.filter((villa) => {
    const imageCount = getVillaGalleryImages(villa).length;
    const undocumented = !hasVillaTourismDocument({
      documentNo: villa.documentNo,
      documentType: villa.documentType,
    });
    return undocumented && imageCount === 1;
  });

  const toUpdate = targets.filter((villa) =>
    offerOnly
      ? villa.showInOffer
      : villa.active || villa.showInOffer
  );

  console.log(
    JSON.stringify(
      {
        dryRun,
        offerOnly,
        matched: targets.length,
        willUpdate: toUpdate.length,
        stillActive: targets.filter((villa) => villa.active).length,
        stillInOffer: targets.filter((villa) => villa.showInOffer).length,
        sample: toUpdate.slice(0, 20).map((villa) => ({
          villaId: villa.villaId,
          name: villa.name,
          active: villa.active,
          showInOffer: villa.showInOffer,
        })),
      },
      null,
      2
    )
  );

  if (dryRun || toUpdate.length === 0) {
    return;
  }

  const result = await prisma.villa.updateMany({
    where: { id: { in: toUpdate.map((villa) => villa.id) } },
    data: offerOnly
      ? { showInOffer: false }
      : { active: false, showInOffer: false },
  });

  console.log(
    offerOnly
      ? `Teklif görünürlüğü kapatılan: ${result.count}`
      : `Güncellenen: ${result.count}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
