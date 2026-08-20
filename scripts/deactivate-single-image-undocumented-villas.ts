/**
 * Tek galeri görseli olan + belgesiz villaları pasif yapar.
 *
 *   npx tsx scripts/deactivate-single-image-undocumented-villas.ts
 *   npx tsx scripts/deactivate-single-image-undocumented-villas.ts --dry-run
 */
import { prisma } from "../lib/db";
import { hasVillaTourismDocument } from "../lib/villa-document-types";
import { getVillaGalleryImages } from "../lib/villa-gallery";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const villas = await prisma.villa.findMany({
    select: {
      id: true,
      villaId: true,
      name: true,
      active: true,
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

  const alreadyPassive = targets.filter((villa) => !villa.active).length;
  const toDeactivate = targets.filter((villa) => villa.active);

  console.log(
    JSON.stringify(
      {
        dryRun,
        matched: targets.length,
        alreadyPassive,
        willDeactivate: toDeactivate.length,
        sample: toDeactivate.slice(0, 20).map((villa) => ({
          villaId: villa.villaId,
          name: villa.name,
        })),
      },
      null,
      2
    )
  );

  if (dryRun || toDeactivate.length === 0) {
    return;
  }

  const result = await prisma.villa.updateMany({
    where: { id: { in: toDeactivate.map((villa) => villa.id) } },
    data: { active: false },
  });

  console.log(`Pasife alınan: ${result.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
