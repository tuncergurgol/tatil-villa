import { prisma } from "../lib/db";

async function main() {
  const terms = ["crac", "ela", "sorsat", "calis", "çalış", "6107"];
  for (const term of terms) {
    const rows = await prisma.villa.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { slug: { contains: term, mode: "insensitive" } },
        ],
      },
      select: { villaId: true, name: true, slug: true, externalSyncUrl1: true },
      take: 10,
    });
    if (rows.length) {
      console.log(`\n=== ${term} ===`);
      console.log(JSON.stringify(rows, null, 2));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
