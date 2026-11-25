import { prisma } from "../lib/db";

async function main() {
  const rows = await prisma.villa.findMany({
    where: {
      OR: [
        { name: { contains: "Mulberry", mode: "insensitive" } },
        { name: { contains: "Violet", mode: "insensitive" } },
        { slug: { contains: "mulberry", mode: "insensitive" } },
        { slug: { contains: "violet", mode: "insensitive" } },
        { documentNo: "07-2815" },
      ],
    },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      documentNo: true,
      externalSyncUrl1: true,
    },
    take: 30,
  });

  for (const row of rows) {
    console.log(
      `${row.villaId ?? "-"} | ${row.name} | ${row.slug} | belge=${row.documentNo || "-"} | link1=${row.externalSyncUrl1 || "(boş)"}`
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
