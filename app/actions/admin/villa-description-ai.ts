"use server";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  buildVillaDescriptionPrompt,
  generateVillaDescriptionTemplate,
  parseVillaDescriptionAiResponse,
  type VillaDescriptionContext,
} from "@/lib/villa-description-generator";

export type VillaDescriptionAiActionState = {
  error?: string;
  description?: string;
  source?: "ai" | "template";
};

export type VillaDescriptionAiInput = {
  villaId: string;
  name: string;
  region: string;
  extraInfo: string;
  guests: number;
  livingRooms: number;
  bedrooms: number;
  bathrooms: number;
  amenityCount: number;
  childFriendly: boolean;
  facilityType: VillaDescriptionContext["facilityType"];
};

async function generateWithOpenAI(prompt: string): Promise<string | null> {
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
            "Tatil konaklama açıklamaları üreten yardımcı bir asistansın. Yanıtlarını HTML formatında ver.",
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

  return parseVillaDescriptionAiResponse(content);
}

export async function generateVillaDescriptionWithAI(
  input: VillaDescriptionAiInput
): Promise<VillaDescriptionAiActionState> {
  await requireAdmin();

  const villa = await prisma.villa.findUnique({
    where: { id: input.villaId },
    select: {
      location: true,
      amenities: true,
    },
  });

  if (!villa) return { error: "Villa bulunamadı" };

  const context: VillaDescriptionContext = {
    name: input.name.trim() || "Villa",
    region: input.region.trim(),
    extraInfo: input.extraInfo.trim(),
    facilityType: input.facilityType,
    guests: input.guests,
    livingRooms: input.livingRooms,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    amenityCount: input.amenityCount,
    childFriendly: input.childFriendly,
    amenities: villa.amenities,
    location: villa.location,
  };

  try {
    const aiDescription = await generateWithOpenAI(
      buildVillaDescriptionPrompt(context)
    );
    if (aiDescription) {
      return { description: aiDescription, source: "ai" };
    }
  } catch {
    // OpenAI başarısız olursa şablon üreticiye düş.
  }

  return {
    description: generateVillaDescriptionTemplate(context),
    source: "template",
  };
}
