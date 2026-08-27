import { prisma } from "../lib/db";
import { HOME_CAMPAIGNS } from "../lib/home-campaigns";

async function main() {
  const hrefs = HOME_CAMPAIGNS.map((campaign) => campaign.href);

  const deactivated = await prisma.campaign.updateMany({
    where: { href: { notIn: [...hrefs] } },
    data: { active: false },
  });

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
    `Kampanyalar güncellendi — oluşturuldu: ${created}, güncellendi: ${updated}, diğerleri pasif: ${deactivated.count}`
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
