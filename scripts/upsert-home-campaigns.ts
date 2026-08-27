import { prisma } from "../lib/db";
import { HOME_CAMPAIGNS } from "../lib/home-campaigns";

async function main() {
  let created = 0;
  let updated = 0;

  for (const campaign of HOME_CAMPAIGNS) {
    const existing = await prisma.campaign.findFirst({
      where: { href: campaign.href },
    });
    const data = { ...campaign };
    if (existing) {
      await prisma.campaign.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.campaign.create({ data });
      created += 1;
    }
  }

  console.log(
    `Kampanyalar güncellendi — oluşturuldu: ${created}, güncellendi: ${updated}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
