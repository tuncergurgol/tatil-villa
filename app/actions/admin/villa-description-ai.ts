"use server";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import {
  buildVillaDescriptionPreview,
  buildVillaDescriptionPrompt,
  formatDescriptionDistanceKm,
  generateVillaDescriptionTemplate,
  isFeaturedAmenityCategory,
  parseVillaDescriptionAiResponse,
  type VillaDescriptionContext,
  type VillaDescriptionDistance,
  type VillaDescriptionPreview,
} from "@/lib/villa-description-generator";
import { formatVillaRegionLabel } from "@/lib/villa-location-helpers";

export type VillaDescriptionAiActionState = {
  error?: string;
  description?: string;
  source?: "ai" | "template";
  preview?: VillaDescriptionPreview;
};

export type VillaDescriptionAiInput = {
  villaId: string;
  name: string;
  region: string;
  extraInfo: string;
  guests: number;
  extraCapacity: number;
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
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content:
            "Sen Türkiye'deki tatil konaklama siteleri için villa açıklamaları yazan uzman bir metin yazarısın. Verilen referans şablonun sıcak, yalın ve ikna edici üslubunu takip edersin. Her villa için özgün, SEO uyumlu ve okunması kolay HTML açıklamalar üretirsin. Uydurma bilgi eklemezsin.",
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

function resolveMinStayNights(
  periods: Array<{ minStayNights: number | null }>
): number | null {
  const values = periods
    .map((period) => period.minStayNights)
    .filter((value): value is number => value != null && value > 0);
  if (values.length === 0) return null;
  return Math.min(...values);
}

function buildDistances(
  rows: Array<{
    distanceKm: number;
    surroundingLocation: {
      name: string;
      category: { name: string; sortOrder: number };
    };
  }>
): VillaDescriptionDistance[] {
  return [...rows]
    .sort((left, right) => {
      const categoryDiff =
        left.surroundingLocation.category.sortOrder -
        right.surroundingLocation.category.sortOrder;
      if (categoryDiff !== 0) return categoryDiff;
      return left.surroundingLocation.name.localeCompare(
        right.surroundingLocation.name,
        "tr"
      );
    })
    .map((row) => ({
      category: row.surroundingLocation.category.name,
      name: row.surroundingLocation.name,
      distanceLabel: formatDescriptionDistanceKm(row.distanceKm),
    }));
}

async function loadVillaDescriptionContext(
  input: VillaDescriptionAiInput
): Promise<VillaDescriptionContext | { error: string }> {
  const villa = await prisma.villa.findUnique({
    where: { id: input.villaId },
    select: {
      location: true,
      amenities: true,
      allowChildren: true,
      allowPets: true,
      allowSmoking: true,
      customRules: true,
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
      surroundingDistances: {
        select: {
          distanceKm: true,
          surroundingLocation: {
            select: {
              name: true,
              category: {
                select: { name: true, sortOrder: true },
              },
            },
          },
        },
      },
      pricePeriods: {
        where: {
          endDate: { gte: new Date() },
        },
        select: { minStayNights: true },
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!villa) return { error: "Villa bulunamadı" };

  const amenityRows = villa.amenities.length
    ? await prisma.amenity.findMany({
        where: {
          name: { in: villa.amenities },
          active: true,
        },
        select: {
          name: true,
          category: { select: { name: true } },
        },
      })
    : [];

  const amenityCategoryByName = new Map(
    amenityRows.map((row) => [row.name, row.category.name])
  );

  const featuredAmenities = villa.amenities.filter((name) =>
    isFeaturedAmenityCategory(amenityCategoryByName.get(name) ?? "")
  );
  const otherAmenities = villa.amenities.filter(
    (name) => !isFeaturedAmenityCategory(amenityCategoryByName.get(name) ?? "")
  );

  const regionLabel = formatVillaRegionLabel(villa.region);
  const regionParts = regionLabel.split(" - ");

  return {
    name: input.name.trim() || "Villa",
    region: input.region.trim() || regionLabel,
    regionMahalle: regionParts[2] ?? villa.region.name,
    regionIlce: regionParts[1] ?? villa.region.parent?.name ?? "",
    regionIl: regionParts[0] ?? villa.region.parent?.parent?.name ?? "",
    extraInfo: input.extraInfo.trim(),
    facilityType: input.facilityType,
    guests: input.guests,
    extraCapacity: input.extraCapacity,
    livingRooms: input.livingRooms,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    amenityCount: input.amenityCount,
    childFriendly: input.childFriendly,
    allowPets: villa.allowPets,
    allowSmoking: villa.allowSmoking,
    customRules: villa.customRules,
    minStayNights: resolveMinStayNights(villa.pricePeriods),
    featuredAmenities,
    amenities: otherAmenities,
    location: villa.location,
    distances: buildDistances(villa.surroundingDistances),
  };
}

export async function getVillaDescriptionAiPreview(
  input: VillaDescriptionAiInput
): Promise<{ preview?: VillaDescriptionPreview; error?: string }> {
  await requireAdmin();

  const context = await loadVillaDescriptionContext(input);
  if ("error" in context) return { error: context.error };

  return { preview: buildVillaDescriptionPreview(context) };
}

export async function generateVillaDescriptionWithAI(
  input: VillaDescriptionAiInput
): Promise<VillaDescriptionAiActionState> {
  await requireAdmin();

  const context = await loadVillaDescriptionContext(input);
  if ("error" in context) return { error: context.error };

  const preview = buildVillaDescriptionPreview(context);

  try {
    const aiDescription = await generateWithOpenAI(
      buildVillaDescriptionPrompt(context)
    );
    if (aiDescription) {
      return { description: aiDescription, source: "ai", preview };
    }
  } catch {
    // OpenAI başarısız olursa şablon üreticiye düş.
  }

  return {
    description: generateVillaDescriptionTemplate(context),
    source: "template",
    preview,
  };
}
