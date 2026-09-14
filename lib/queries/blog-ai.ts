import { prisma } from "@/lib/db";
import { ensureBlogAiSettings } from "@/lib/blog-ai-runner";

export async function getBlogAiSettingsForAdmin() {
  return ensureBlogAiSettings();
}

export async function getBlogAiTopicsForAdmin() {
  return prisma.blogAiTopic.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}
