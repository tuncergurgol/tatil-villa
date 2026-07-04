import type { Villa, VillaCategory } from "@prisma/client";
import { normalizeSearchText } from "@/lib/search-text";
import { categoryLabel } from "@/lib/utils";

export interface VillaSeoContext {
  name: string;
  slug: string;
  category: VillaCategory;
  location: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  facilityCategories: string[];
  deal: boolean;
  popular: boolean;
  recommended: boolean;
  ribbonText1: string;
  ribbonText2: string;
  regionBreadcrumb: string;
  regionName: string;
}

export interface VillaSeoSuggestion {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

function uniqueKeywords(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalizeSearchText(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function buildHighlights(villa: VillaSeoContext) {
  const highlights: string[] = [];
  if (villa.deal) highlights.push("fırsat villası");
  if (villa.popular) highlights.push("popüler tercih");
  if (villa.recommended) highlights.push("önerilen konaklama");
  if (villa.ribbonText1.trim()) highlights.push(villa.ribbonText1.trim());
  if (villa.ribbonText2.trim()) highlights.push(villa.ribbonText2.trim());
  return highlights;
}

export function generateVillaSeoSuggestion(
  villa: VillaSeoContext
): VillaSeoSuggestion {
  const typeLabel = categoryLabel(villa.category);
  const typeLower = typeLabel.toLocaleLowerCase("tr-TR");
  const regionShort = villa.regionName || villa.location;
  const highlights = buildHighlights(villa);
  const amenitySample = villa.amenities.slice(0, 4);
  const facilitySample = villa.facilityCategories.slice(0, 2);

  const titleCandidates = [
    `${villa.name} | ${regionShort} ${typeLabel}`,
    `${villa.name} - ${regionShort} ${typeLower} kiralama`,
    `${regionShort} ${typeLabel} | ${villa.name}`,
  ];
  const seoTitle = truncate(
    titleCandidates.find((candidate) => candidate.length <= 60) ??
      titleCandidates[0],
    60
  );

  const descriptionParts = [
    `${villa.name}, ${villa.regionBreadcrumb || regionShort} bölgesinde ${villa.guests} kişilik, ${villa.bedrooms} yatak odalı ${typeLower} kiralama seçeneği.`,
    amenitySample.length
      ? `Öne çıkan olanaklar: ${amenitySample.join(", ")}.`
      : null,
    facilitySample.length
      ? `Tesis kategorileri: ${facilitySample.join(", ")}.`
      : null,
    highlights.length ? `Vitrin: ${highlights.join(", ")}.` : null,
    "Tatildeyiz ile güvenli ve hızlı rezervasyon.",
  ].filter(Boolean);

  const seoDescription = truncate(descriptionParts.join(" "), 160);

  const seoKeywords = uniqueKeywords([
    villa.name,
    regionShort,
    villa.regionBreadcrumb,
    typeLabel,
    `${typeLower} kiralama`,
    `${regionShort} tatil`,
    `${regionShort} ${typeLower}`,
    ...amenitySample,
    ...facilitySample,
    ...highlights,
    "tatil",
    "rezervasyon",
    "tatildeyiz",
  ])
    .slice(0, 10)
    .join(", ");

  return { seoTitle, seoDescription, seoKeywords };
}

export function buildVillaSeoPrompt(villa: VillaSeoContext) {
  const highlights = buildHighlights(villa);

  return `Sen bir Türkçe SEO uzmanısın. Aşağıdaki tatil konaklama tesisi için meta başlık, meta açıklama ve anahtar kelimeler üret.

Tesis adı: ${villa.name}
Slug: ${villa.slug}
Kategori: ${categoryLabel(villa.category)}
Bölge: ${villa.regionBreadcrumb || villa.regionName}
Konum: ${villa.location}
Kapasite: ${villa.guests} kişi, ${villa.bedrooms} yatak odası, ${villa.bathrooms} banyo
Olanaklar: ${villa.amenities.slice(0, 8).join(", ") || "belirtilmedi"}
Tesis kategorileri: ${villa.facilityCategories.join(", ") || "belirtilmedi"}
Öne çıkanlar: ${highlights.join(", ") || "belirtilmedi"}

Kurallar:
- Meta başlık en fazla 60 karakter
- Meta açıklama en fazla 160 karakter
- Anahtar kelimeler virgülle ayrılmış, en fazla 10 adet
- Türkçe, doğal ve arama motoru dostu yaz
- Sadece JSON döndür: {"seoTitle":"...","seoDescription":"...","seoKeywords":"..."}`;
}

export function parseVillaSeoAiResponse(content: string): VillaSeoSuggestion | null {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<VillaSeoSuggestion>;
    if (
      typeof parsed.seoTitle !== "string" ||
      typeof parsed.seoDescription !== "string" ||
      typeof parsed.seoKeywords !== "string"
    ) {
      return null;
    }

    return {
      seoTitle: truncate(parsed.seoTitle.trim(), 60),
      seoDescription: truncate(parsed.seoDescription.trim(), 160),
      seoKeywords: parsed.seoKeywords.trim(),
    };
  } catch {
    return null;
  }
}
