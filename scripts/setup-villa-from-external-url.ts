/**
 * Dış acente villa sayfasından tam kurulum.
 *
 *   npx tsx scripts/setup-villa-from-external-url.ts --url "https://www.villareyonu.com/villa-sole-marin" --name "Villa Sole Mare"
 */
import { setupVillaFromExternalUrl } from "../lib/external-villa-setup-runner";
import { prisma } from "../lib/db";

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return "";
  return String(process.argv[index + 1] ?? "").trim();
}

async function main() {
  const pageUrl = argValue("--url") || process.argv[2];
  const name = argValue("--name");
  if (!pageUrl) {
    throw new Error("Kullanım: --url https://... [--name \"Villa Adı\"]");
  }

  const result = await setupVillaFromExternalUrl(pageUrl, {
    name: name || undefined,
    publish: true,
  });

  console.log(
    JSON.stringify(
      {
        created: result.created,
        villaId: result.numericVillaId,
        name: result.name,
        slug: result.slug,
        editPath: result.editPath,
        imageCount: result.imageCount,
        distanceCount: result.distanceCount,
        roomCount: result.roomCount,
        periodCount: result.periodCount,
        bookedDays: result.bookedDays,
        optionDays: result.optionDays,
        documentNo: result.documentNo,
        link1: result.link1,
        published: result.published,
        warnings: result.warnings,
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
