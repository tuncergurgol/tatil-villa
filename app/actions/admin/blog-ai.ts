"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { BlogAiPublishFrequency } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  ensureBlogAiSettings,
  resolveNextBlogAiRunAtOnSave,
  runBlogAiGenerationForTopic,
  runScheduledBlogAiGeneration,
} from "@/lib/blog-ai-runner";

export type BlogAiActionState = {
  error?: string;
  success?: boolean;
  message?: string;
  blogPostId?: string;
  slug?: string;
};

function revalidateBlogAiPaths() {
  revalidatePath("/admin/icerik");
  revalidatePath("/blog");
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum([
    "EVERY_1_DAY",
    "EVERY_2_DAYS",
    "EVERY_3_DAYS",
    "WEEKLY",
    "BIWEEKLY",
    "MONTHLY",
  ]),
  defaultCategoryId: z.string().optional(),
  autoPublish: z.boolean(),
});

export async function saveBlogAiSettingsAction(
  formData: FormData
): Promise<BlogAiActionState> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    frequency: formData.get("frequency"),
    defaultCategoryId: String(formData.get("defaultCategoryId") ?? "").trim() || undefined,
    autoPublish: formData.get("autoPublish") === "on",
  });

  if (!parsed.success) {
    return { error: "Geçersiz ayarlar" };
  }

  const current = await ensureBlogAiSettings();
  const frequency = parsed.data.frequency as BlogAiPublishFrequency;
  const nextRunAt = resolveNextBlogAiRunAtOnSave({
    enabled: parsed.data.enabled,
    frequency,
    currentEnabled: current.enabled,
    currentNextRunAt: current.nextRunAt,
  });

  await prisma.blogAiSettings.update({
    where: { id: "default" },
    data: {
      enabled: parsed.data.enabled,
      frequency,
      defaultCategoryId: parsed.data.defaultCategoryId ?? null,
      autoPublish: parsed.data.autoPublish,
      nextRunAt,
    },
  });

  revalidateBlogAiPaths();
  return { success: true, message: "Ayarlar kaydedildi" };
}

export async function addBlogAiTopicsAction(
  formData: FormData
): Promise<BlogAiActionState> {
  await requireAdmin();

  const raw = String(formData.get("topics") ?? "").trim();
  if (!raw) return { error: "En az bir konu girin" };

  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const topics = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (topics.length === 0) return { error: "Geçerli konu bulunamadı" };

  const maxSort = await prisma.blogAiTopic.aggregate({
    _max: { sortOrder: true },
  });
  let sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

  await prisma.blogAiTopic.createMany({
    data: topics.map((topic) => ({
      topic,
      categoryId,
      sortOrder: sortOrder++,
    })),
  });

  revalidateBlogAiPaths();
  return {
    success: true,
    message: `${topics.length} konu listeye eklendi`,
  };
}

export async function deleteBlogAiTopicAction(
  id: string
): Promise<BlogAiActionState> {
  await requireAdmin();
  await prisma.blogAiTopic.delete({ where: { id } });
  revalidateBlogAiPaths();
  return { success: true };
}

export async function resetBlogAiTopicAction(
  id: string
): Promise<BlogAiActionState> {
  await requireAdmin();
  await prisma.blogAiTopic.update({
    where: { id },
    data: {
      status: "PENDING",
      errorMessage: "",
      blogPostId: null,
      generatedAt: null,
    },
  });
  revalidateBlogAiPaths();
  return { success: true, message: "Konu yeniden kuyruğa alındı" };
}

export async function generateBlogAiTopicNowAction(
  id: string
): Promise<BlogAiActionState> {
  await requireAdmin();
  const result = await runBlogAiGenerationForTopic(id);
  revalidateBlogAiPaths();
  if (!result.ok) return { error: result.message };
  if (result.slug) revalidatePath(`/blog/${result.slug}`);
  return {
    success: true,
    message: result.message,
    blogPostId: result.blogPostId,
    slug: result.slug,
  };
}

export async function runBlogAiSchedulerNowAction(): Promise<BlogAiActionState> {
  await requireAdmin();
  const result = await runScheduledBlogAiGeneration({ force: true });
  revalidateBlogAiPaths();
  if (!result.ok) return { error: result.message };
  if (result.slug) revalidatePath(`/blog/${result.slug}`);
  return {
    success: true,
    message: result.message,
    blogPostId: result.blogPostId,
    slug: result.slug,
  };
}
