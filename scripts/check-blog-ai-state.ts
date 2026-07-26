import { prisma } from "../lib/db";

async function main() {
  const settings = await prisma.blogAiSettings.findUnique({
    where: { id: "default" },
  });
  const topics = await prisma.blogAiTopic.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      topic: true,
      status: true,
      errorMessage: true,
      generatedAt: true,
    },
  });
  console.log(
    JSON.stringify(
      {
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
        settings,
        topics,
      },
      null,
      2
    )
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
