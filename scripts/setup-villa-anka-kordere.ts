/**
 * Villa Anka Kördere — egetatilevleri.com.tr LINK1 kurulum.
 *
 *   npx tsx scripts/setup-villa-anka-kordere.ts
 */
import { setupVillaFromExternalUrl } from "../lib/external-villa-setup-runner";
import { prisma } from "../lib/db";

const URL =
  "https://egetatilevleri.com.tr/kas-kiralik-villa/villa-anka-kordere";

async function main() {
  const result = await setupVillaFromExternalUrl(URL, {
    name: "Villa Anka Kördere",
    publish: true,
  });
  console.log(
    JSON.stringify(
      {
        created: result.created,
        villaId: result.numericVillaId,
        slug: result.slug,
        documentNo: result.documentNo,
        imageCount: result.imageCount,
        roomCount: result.roomCount,
        distanceCount: result.distanceCount,
        periodCount: result.periodCount,
        bookedDays: result.bookedDays,
        optionDays: result.optionDays,
        link1: result.link1,
        published: result.published,
        warnings: result.warnings,
        editPath: result.editPath,
      },
      null,
      2
    )
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
