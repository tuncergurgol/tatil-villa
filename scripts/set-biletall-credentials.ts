import { prisma } from "../lib/db";
import { DEFAULT_COMPANY_SETTINGS } from "../lib/queries/company-settings";

const username = process.env.BILETALL_USERNAME?.trim();
const password = process.env.BILETALL_PASSWORD ?? "";

if (!username || !password) {
  console.error("BILETALL_USERNAME ve BILETALL_PASSWORD ortam degiskenleri gerekli.");
  process.exit(1);
}

async function main() {
  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      biletallUsername: username,
      biletallPassword: password,
      biletallEnabled: true,
    },
    update: {
      biletallUsername: username,
      biletallPassword: password,
      biletallEnabled: true,
    },
  });

  console.log(`Biletall giris bilgileri kaydedildi: ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
