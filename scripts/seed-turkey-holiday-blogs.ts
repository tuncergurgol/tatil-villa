import { seedTurkeyHolidayBlogs } from "../lib/seed-turkey-holiday-blogs";

async function main() {
  const result = await seedTurkeyHolidayBlogs();
  console.log(
    `Resmi tatil blogları eklendi: ${result.count} yazı (${result.categorySlug})`
  );
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
