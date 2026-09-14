import { seedCmsContent } from "../prisma/cms-content-seed";

async function main() {
  await seedCmsContent();
  console.log("CMS içerik seed tamamlandı (SSS, kurumsal sayfalar, menüler, örnek yorumlar).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../lib/db");
    await prisma.$disconnect();
  });
