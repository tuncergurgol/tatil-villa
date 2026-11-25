/**
 * Villa Patara Adonis 4 — villadenizi.com.tr kurulum/güncelleme
 *   npx tsx scripts/setup-villa-adonis-4-villadenizi.ts
 */
import { setupVillaFromExternalUrl } from "../lib/external-villa-setup-runner";
import { prisma } from "../lib/db";

const URL = "https://www.villadenizi.com.tr/villa/villa-adonis-4";

async function main() {
  const result = await setupVillaFromExternalUrl(URL, {
    name: "Villa Patara Adonis 4",
    publish: true,
  });
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
