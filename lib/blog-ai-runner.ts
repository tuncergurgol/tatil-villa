import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { BlogAiPublishFrequency } from "@prisma/client";
import { prisma } from "@/lib/db";
import { slugifyTurkish } from "@/lib/tatildeyiz-next-data";
import {
  computeNextBlogAiRunAt,
  getBlogAiFrequencyDays,
} from "@/lib/blog-ai-frequency";
import {
  buildBlogGenerationPrompt,
  generateBlogTemplate,
  parseBlogAiResponse,
  type BlogGenerationResult,
} from "@/lib/blog-generator";

const FALLBACK_COVER_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=630&fit=crop&q=80";

async function generateBlogTextWithOpenAI(
  prompt: string
): Promise<BlogGenerationResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "Tatil ve villa kiralama blog içerikleri üreten yardımcı bir asistansın. Yanıtlarını yalnızca istenen JSON formatında ver.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  return parseBlogAiResponse(content);
}

async function generateCoverImage(
  prompt: string,
  slug: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return FALLBACK_COVER_IMAGE;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `${prompt}. Professional travel photography, no text, no watermark.`,
        n: 1,
        size: "1792x1024",
        response_format: "url",
      }),
    });

    if (!response.ok) return FALLBACK_COVER_IMAGE;

    const data = (await response.json()) as {
      data?: { url?: string }[];
    };
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) return FALLBACK_COVER_IMAGE;

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) return FALLBACK_COVER_IMAGE;

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "uploads", "blog-ai");
    await mkdir(dir, { recursive: true });
    const filename = `${slug}-${Date.now()}.jpg`;
    await writeFile(path.join(dir, filename), buffer);
    return `/uploads/blog-ai/${filename}`;
  } catch {
    return FALLBACK_COVER_IMAGE;
  }
}

async function buildUniqueBlogSlug(base: string) {
  const root = slugifyTurkish(base) || "blog-yazisi";
  let candidate = root;
  let suffix = 2;

  while (await prisma.blogPost.findUnique({ where: { slug: candidate } })) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function generateBlogContentForTopic(options: {
  topic: string;
  categoryName?: string | null;
}) {
  const prompt = buildBlogGenerationPrompt({
    topic: options.topic,
    categoryName: options.categoryName,
  });

  try {
    const aiResult = await generateBlogTextWithOpenAI(prompt);
    if (aiResult) {
      return { result: aiResult, source: "ai" as const };
    }
  } catch {
    // şablona düş
  }

  return {
    result: generateBlogTemplate({
      topic: options.topic,
      categoryName: options.categoryName,
    }),
    source: "template" as const,
  };
}

export type BlogAiRunResult = {
  ok: boolean;
  topicId?: string;
  blogPostId?: string;
  slug?: string;
  source?: "ai" | "template";
  message: string;
};

export async function runBlogAiGenerationForTopic(
  topicId: string
): Promise<BlogAiRunResult> {
  const topic = await prisma.blogAiTopic.findUnique({ where: { id: topicId } });
  if (!topic) {
    return { ok: false, message: "Konu bulunamadı" };
  }
  if (topic.status === "GENERATING") {
    return { ok: false, message: "Bu konu zaten üretiliyor" };
  }
  if (topic.status === "COMPLETED" && topic.blogPostId) {
    return { ok: false, message: "Bu konu için blog zaten oluşturulmuş" };
  }

  const settings = await prisma.blogAiSettings.upsert({
    where: { id: "default" },
    create: {},
    update: {},
  });

  const categoryId = topic.categoryId ?? settings.defaultCategoryId;
  const category = categoryId
    ? await prisma.blogCategory.findUnique({
        where: { id: categoryId },
        select: { name: true },
      })
    : null;

  await prisma.blogAiTopic.update({
    where: { id: topicId },
    data: { status: "GENERATING", errorMessage: "" },
  });

  try {
    const { result, source } = await generateBlogContentForTopic({
      topic: topic.topic,
      categoryName: category?.name,
    });

    const slug = await buildUniqueBlogSlug(result.slug || result.title);
    const coverImage = await generateCoverImage(result.coverImagePrompt, slug);

    const post = await prisma.blogPost.create({
      data: {
        title: result.title,
        slug,
        excerpt: result.excerpt,
        content: result.content,
        coverImage,
        categoryId,
        seoTitle: result.seoTitle,
        seoDescription: result.seoDescription,
        seoKeywords: result.seoKeywords,
        published: settings.autoPublish,
        publishedAt: settings.autoPublish ? new Date() : null,
      },
    });

    const now = new Date();
    await prisma.$transaction([
      prisma.blogAiTopic.update({
        where: { id: topicId },
        data: {
          status: "COMPLETED",
          blogPostId: post.id,
          generatedAt: now,
          errorMessage: "",
        },
      }),
      prisma.blogAiSettings.update({
        where: { id: "default" },
        data: {
          lastGeneratedAt: now,
          nextRunAt: computeNextBlogAiRunAt(settings.frequency, now),
        },
      }),
    ]);

    return {
      ok: true,
      topicId,
      blogPostId: post.id,
      slug: post.slug,
      source,
      message: "Blog yazısı oluşturuldu",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Blog üretilemedi";
    await prisma.blogAiTopic.update({
      where: { id: topicId },
      data: { status: "FAILED", errorMessage: message },
    });
    return { ok: false, topicId, message };
  }
}

export async function runScheduledBlogAiGeneration(): Promise<BlogAiRunResult> {
  const settings = await prisma.blogAiSettings.findUnique({
    where: { id: "default" },
  });

  if (!settings?.enabled) {
    return { ok: false, message: "Otomatik blog üretimi kapalı" };
  }

  const now = new Date();
  if (settings.nextRunAt && settings.nextRunAt > now) {
    return {
      ok: false,
      message: `Sonraki çalışma: ${settings.nextRunAt.toISOString()}`,
    };
  }

  if (settings.lastGeneratedAt) {
    const minNext = new Date(settings.lastGeneratedAt);
    minNext.setDate(
      minNext.getDate() + getBlogAiFrequencyDays(settings.frequency)
    );
    if (minNext > now) {
      return { ok: false, message: "Yayın sıklığı henüz dolmadı" };
    }
  }

  const nextTopic = await prisma.blogAiTopic.findFirst({
    where: { status: { in: ["PENDING", "FAILED"] } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (!nextTopic) {
    return { ok: false, message: "Bekleyen konu yok" };
  }

  return runBlogAiGenerationForTopic(nextTopic.id);
}

export async function ensureBlogAiSettings() {
  return prisma.blogAiSettings.upsert({
    where: { id: "default" },
    create: {},
    update: {},
  });
}
