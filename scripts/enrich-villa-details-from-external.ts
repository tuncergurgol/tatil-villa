/**
 * Mevcut villaya kaynak sayfadan oda/havuz/konum/mesafe doldurur.
 *
 *   npx tsx scripts/enrich-villa-details-from-external.ts --url=... [--villa-id=cuid]
 */
import { enrichVillaDetailsFromExternalUrl } from "../lib/external-villa-setup-runner";
import { prisma } from "../lib/db";

function readArg(name: string) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  return hit ? hit.slice(prefix.length).trim() : "";
}

async function main() {
  const pageUrl = readArg("url");
  const villaId = readArg("villa-id") || undefined;
  if (!pageUrl) {
    throw new Error("Kullanım: --url=https://...");
  }

  const result = await enrichVillaDetailsFromExternalUrl(pageUrl, { villaId });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
