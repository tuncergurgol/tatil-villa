import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return;
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("DATABASE_URL=")) continue;
    let value = trimmed.slice("DATABASE_URL=".length).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env.DATABASE_URL = value;
    return;
  }
}

async function main() {
  loadDatabaseUrl();
  const { seedSeoVillaBlogs } = await import("../lib/seed-seo-villa-blogs");
  const result = await seedSeoVillaBlogs();
  console.log(`SEO villa blogları eklendi: ${result.count}`);
  for (const slug of result.slugs) console.log(slug);
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
