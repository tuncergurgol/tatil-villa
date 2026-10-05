import { publishPoolHygieneBlogPost } from "@/lib/publish-pool-hygiene-blog";

async function main() {
  const post = await publishPoolHygieneBlogPost();
  console.log(JSON.stringify(post, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.$disconnect();
  });
