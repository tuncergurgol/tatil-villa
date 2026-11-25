"use server";

import { revalidatePath } from "next/cache";
import { generateVillaDescriptionForVillaId } from "@/app/actions/admin/villa-description-ai";
import { generateVillaSeoWithAI } from "@/app/actions/admin/villa-seo-ai";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { revalidateVillaEditPage } from "@/lib/villa-admin-path.server";
import { villaPublicPath } from "@/lib/villa-public-path";

export type VillaContentAiRegenerateScope = "all" | "description" | "seo";

export type VillaContentAiBulkActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

function buildDescriptionReport(source?: "ai" | "template") {
  return source === "ai"
    ? "Açıklama yapay zeka ile oluşturuldu."
    : "Açıklama villa verilerine göre otomatik oluşturuldu.";
}

function buildSeoReport(source?: "ai" | "template") {
  return source === "ai"
    ? "SEO metinleri yapay zeka ile oluşturuldu."
    : "SEO metinleri villa verilerine göre otomatik oluşturuldu.";
}

async function revalidateVillaContentPaths(villaId: string, slug?: string | null) {
  revalidatePath("/admin/konaklama/ayarlar");
  revalidatePath("/admin/villalar");
  await revalidateVillaEditPage(villaId);
  if (slug) {
    revalidatePath("/");
    revalidatePath("/villalar");
    revalidatePath(villaPublicPath(slug));
    revalidatePath(`/villalar/${slug}`);
  }
}

export async function regenerateVillaContentAiAction(
  villaId: string,
  scope: VillaContentAiRegenerateScope = "all"
): Promise<VillaContentAiBulkActionResult> {
  await requireAdmin();

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    select: { id: true, slug: true },
  });
  if (!villa) return { error: "Villa bulunamadı" };

  const now = new Date();
  const data: {
    description?: string;
    descriptionAiUpdatedAt?: Date;
    descriptionAiReport?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
    seoAiUpdatedAt?: Date;
    seoAiReport?: string;
  } = {};

  if (scope === "all" || scope === "description") {
    const descriptionResult = await generateVillaDescriptionForVillaId(villaId);
    if (descriptionResult.error || !descriptionResult.description) {
      return {
        error: descriptionResult.error ?? "Açıklama oluşturulamadı",
      };
    }
    data.description = descriptionResult.description;
    data.descriptionAiUpdatedAt = now;
    data.descriptionAiReport = buildDescriptionReport(descriptionResult.source);
  }

  if (scope === "all" || scope === "seo") {
    const seoResult = await generateVillaSeoWithAI(villaId);
    if (seoResult.error || !seoResult.suggestion) {
      return {
        error: seoResult.error ?? "SEO metinleri oluşturulamadı",
      };
    }
    data.seoTitle = seoResult.suggestion.seoTitle;
    data.seoDescription = seoResult.suggestion.seoDescription;
    data.seoKeywords = seoResult.suggestion.seoKeywords;
    data.seoAiUpdatedAt = now;
    data.seoAiReport = buildSeoReport(seoResult.source);
  }

  await prisma.villa.update({
    where: { id: villaId },
    data,
  });

  await revalidateVillaContentPaths(villaId, villa.slug);

  const parts: string[] = [];
  if (data.descriptionAiReport) parts.push(data.descriptionAiReport);
  if (data.seoAiReport) parts.push(data.seoAiReport);

  return {
    success: true,
    message: parts.join(" "),
  };
}

export async function regenerateSelectedVillaContentAiAction(
  villaIds: string[],
  scope: VillaContentAiRegenerateScope = "all"
): Promise<VillaContentAiBulkActionResult> {
  await requireAdmin();

  const uniqueIds = Array.from(
    new Set(villaIds.map((id) => id.trim()).filter(Boolean))
  );
  if (uniqueIds.length === 0) {
    return { error: "Güncellemek için en az bir villa seçin" };
  }

  let okCount = 0;
  let failCount = 0;
  const failSamples: string[] = [];

  for (const villaId of uniqueIds) {
    const result = await regenerateVillaContentAiAction(villaId, scope);
    if (result.success) {
      okCount += 1;
    } else {
      failCount += 1;
      if (failSamples.length < 5) {
        failSamples.push(result.error || "Bilinmeyen hata");
      }
    }
  }

  if (failCount === 0) {
    return {
      success: true,
      message: `${okCount} villa için içerik yeniden oluşturuldu.`,
    };
  }

  return {
    success: okCount > 0,
    message: `${okCount} başarılı, ${failCount} hatalı. ${failSamples.join(" | ")}`,
    error: okCount === 0 ? failSamples.join(" | ") : undefined,
  };
}
