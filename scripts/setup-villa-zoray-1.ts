/**
 * Villa Zoray 1 — villaekstra hafif kurulum + Link 1 fiyat/takvim.
 *
 *   npx tsx scripts/setup-villa-zoray-1.ts
 *   npx tsx scripts/setup-villa-zoray-1.ts --entity-id=2072
 */
import { setupVillaFromExternalUrl } from "../lib/external-villa-setup-runner";
import { prisma } from "../lib/db";

const BASE_URL = "https://www.villaekstra.com/villa-zoray-1";
const DEFAULT_ENTITY_ID = "2072";
const DOCUMENT_NO = "HI-00967";

function readEntityId() {
  const arg = process.argv.find((item) => item.startsWith("--entity-id="));
  if (arg) return arg.slice("--entity-id=".length).trim();
  return DEFAULT_ENTITY_ID;
}

async function main() {
  const entityId = readEntityId();
  const url = `${BASE_URL}?entityId=${encodeURIComponent(entityId)}`;

  console.log("Kurulum:", url);
  const result = await setupVillaFromExternalUrl(url, {
    name: "Villa Zoray 1",
    publish: true,
  });

  if (DOCUMENT_NO) {
    await prisma.villa.update({
      where: { id: result.villaId },
      data: {
        documentNo: DOCUMENT_NO,
        documentType: "KONUT_BELGESI",
        active: true,
        showInSearch: true,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        created: result.created,
        villaId: result.numericVillaId,
        slug: result.slug,
        periods: result.periodCount,
        bookedDays: result.bookedDays,
        images: result.imageCount,
        link1: result.link1,
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
