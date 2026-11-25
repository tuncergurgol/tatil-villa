const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.villa.findMany({
    where: { villaId: { gte: 1, lte: 100 } },
    orderBy: { villaId: "asc" },
    select: { slug: true, villaId: true, name: true },
  });

  console.log(`Toplam ${rows.length} villa icin import basliyor (1-100).`);

  for (const row of rows) {
    console.log(`\n[VillaID ${row.villaId}] ${row.name} (${row.slug})`);
    execSync(
      `npx tsx scripts/import-villa-periods-from-tatildeyiz.ts --slug=${row.slug} --force`,
      { stdio: "inherit" }
    );
  }

  console.log("\nToplu import tamamlandi.");
}

main()
  .catch((error) => {
    console.error("\nToplu import hatasi:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
