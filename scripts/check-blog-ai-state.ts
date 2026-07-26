import { isBlogAiConfigured } from "../lib/blog-ai-runner";
import { isGeminiConfigured } from "../lib/gemini-client";
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
        geminiConfigured: isGeminiConfigured(),
        blogAiConfigured: isBlogAiConfigured(),
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
