"use server";

import { requireAdmin } from "@/lib/auth-helpers";
import {
  generateTextWithGemini,
  isGeminiConfigured,
} from "@/lib/gemini-client";

export type FacilityCategoryCopy = {
  description: string;
  longDescription: string;
  seoTitle: string;
  seoKeywords: string;
  seoDescription: string;
};

export type FacilityCategoryAiState = {
  error?: string;
  copy?: FacilityCategoryCopy;
};

function parseCopy(raw: string): FacilityCategoryCopy | null {
  const json = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    const parsed = JSON.parse(json) as Partial<FacilityCategoryCopy>;
    const description = parsed.description?.trim() ?? "";
    const longDescription = parsed.longDescription?.trim() ?? "";
    const seoTitle = parsed.seoTitle?.trim() ?? "";
    const seoKeywords = parsed.seoKeywords?.trim() ?? "";
    const seoDescription = parsed.seoDescription?.trim() ?? "";
    if (!description || !longDescription || !seoTitle || !seoDescription) {
      return null;
    }
    return {
      description,
      longDescription,
      seoTitle: seoTitle.slice(0, 70),
      seoKeywords,
      seoDescription: seoDescription.slice(0, 170),
    };
  } catch {
    return null;
  }
}

export async function generateFacilityCategoryCopy(
  name: string
): Promise<FacilityCategoryAiState> {
  await requireAdmin();
  const categoryName = name.trim();
  if (!categoryName) return { error: "Önce kategori adını yazın." };
  if (!isGeminiConfigured()) {
    return { error: "Yapay zeka servisi şu an kullanılamıyor." };
  }

  const prompt = [
    `Villa kiralama sitesi için "${categoryName}" kategori sayfasının boş metinlerini yaz.`,
    "Dil Türkçe. Üslup saygılı, samimi ve sade olsun.",
    "Uydurma fiyat, puan veya garanti yazma.",
    "Yalnızca şu JSON'u döndür:",
    '{"description":"1-2 cümle kısa açıklama","longDescription":"iki kısa paragraf","seoTitle":"60 karakter civarı başlık","seoKeywords":"virgülle ayrılmış 6 anahtar kelime","seoDescription":"150 karakter civarı meta açıklama"}',
  ].join("\n");

  const raw = await generateTextWithGemini({
    systemInstruction:
      "Tatildeyiz villa kiralama sitesi için kategori metni yazan yardımcı bir asistansın. Yalnızca JSON döndür.",
    prompt,
    jsonMode: true,
    temperature: 0.6,
    maxOutputTokens: 1200,
  });

  const copy = raw ? parseCopy(raw) : null;
  if (!copy) return { error: "Metin üretilemedi. Tekrar deneyin." };
  return { copy };
}
