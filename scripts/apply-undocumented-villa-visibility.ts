/**
 * Belgesiz villaları: aktif, aramada gizli, teklifte görünür yapar.
 *
 *   npx tsx scripts/apply-undocumented-villa-visibility.ts
 */
import { prisma } from "../lib/db";
import { PUBLIC_SITE_KEYS } from "../lib/public-site-keys";

async function main() {
  const updated = await prisma.$executeRaw`
    UPDATE "Villa"
    SET
      active = true,
      "showInSearch" = false,
      "showInOffer" = true
    WHERE "documentType" IS NULL
      AND btrim("documentNo") = ''
  `;

  await prisma.companySettings.updateMany({
    data: {
      publishUndocumentedVillaSiteKeys: [...PUBLIC_SITE_KEYS],
    },
  });

  console.log(`Belgesiz villa görünürlüğü güncellendi: ${updated} kayıt`);
  console.log(
    `Belgesiz villa public yayın siteleri: ${PUBLIC_SITE_KEYS.join(", ")}`
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
