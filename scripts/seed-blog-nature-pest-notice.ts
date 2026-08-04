import { seedCmsContent } from "../prisma/cms-content-seed";

async function main() {
  await seedCmsContent();
  console.log("Böcek/ilaçlama blog yazısı ve CMS seed tamamlandı.");
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
