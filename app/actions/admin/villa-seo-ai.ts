"use server";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  buildVillaSeoPrompt,
  generateVillaSeoSuggestion,
  parseVillaSeoAiResponse,
  type VillaSeoContext,
  type VillaSeoSuggestion,
} from "@/lib/villa-seo-generator";

export type VillaSeoAiActionState = {
  error?: string;
  suggestion?: VillaSeoSuggestion;
  source?: "ai" | "template";
};

function buildRegionBreadcrumb(region: {
  name: string;
  parent: {
    name: string;
    parent: { name: string } | null;
  } | null;
}) {
  return [region.parent?.parent?.name, region.parent?.name, region.name]
    .filter(Boolean)
    .join(" > ");
}

async function generateWithOpenAI(
  prompt: string
): Promise<VillaSeoSuggestion | null> {
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
            "Tatil konaklama SEO metinleri üreten yardımcı bir asistansın.",
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

  return parseVillaSeoAiResponse(content);
}

export async function generateVillaSeoWithAI(
  villaId: string
): Promise<VillaSeoAiActionState> {
  await requireAdmin();

  const villa = await prisma.villa.findUnique({
    where: { id: villaId },
    include: {
      region: {
        select: {
          name: true,
          parent: {
            select: {
              name: true,
              parent: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!villa) return { error: "Villa bulunamadı" };

  const context: VillaSeoContext = {
    name: villa.name,
    slug: villa.slug,
    category: villa.category,
    location: villa.location,
    guests: villa.guests,
    bedrooms: villa.bedrooms,
    bathrooms: villa.bathrooms,
    amenities: villa.amenities,
    facilityCategories: villa.facilityCategories,
    deal: villa.deal,
    popular: villa.popular,
    recommended: villa.recommended,
    ribbonText1: villa.ribbonText1,
    ribbonText2: villa.ribbonText2,
    regionBreadcrumb: buildRegionBreadcrumb(villa.region),
    regionName: villa.region.name,
  };

  try {
    const aiSuggestion = await generateWithOpenAI(buildVillaSeoPrompt(context));
    if (aiSuggestion) {
      return { suggestion: aiSuggestion, source: "ai" };
    }
  } catch {
    // OpenAI başarısız olursa şablon üreticiye düş.
  }

  return {
    suggestion: generateVillaSeoSuggestion(context),
    source: "template",
  };
}
