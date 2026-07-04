import type { VillaCategory } from "@prisma/client";
import { facilityTypeLabel } from "@/lib/facility-type";

export interface VillaDescriptionContext {
  name: string;
  region: string;
  extraInfo: string;
  facilityType: VillaCategory;
  guests: number;
  livingRooms: number;
  bedrooms: number;
  bathrooms: number;
  amenityCount: number;
  childFriendly: boolean;
  amenities: string[];
  location: string;
}

export function buildVillaDescriptionPrompt(context: VillaDescriptionContext) {
  const typeLabel = facilityTypeLabel(context.facilityType);
  const roomSummary = [
    context.livingRooms > 0 ? `${context.livingRooms} salon` : null,
    `${context.bedrooms} yatak odası`,
    `${context.bathrooms} banyo`,
  ]
    .filter(Boolean)
    .join(", ");

  return `Türkiye'de tatil konaklama sitesi için SEO uyumlu, zengin ve ikna edici bir villa açıklaması yaz.

Ev adı: ${context.name}
Bölge: ${context.region || context.location}
Ev tipi: ${typeLabel}
Kapasite: ${context.guests} kişi
Odalar: ${roomSummary}
Olanak sayısı: ${context.amenityCount}
Çocuk dostu: ${context.childFriendly ? "Evet" : "Hayır"}
Öne çıkan olanaklar: ${context.amenities.slice(0, 12).join(", ") || "Belirtilmedi"}
Ek notlar: ${context.extraInfo || "Yok"}

Kurallar:
- Türkçe yaz
- HTML formatında döndür (p, h2, ul, li etiketleri kullan)
- 3-5 paragraf + madde işaretli özellik listesi içersin
- Abartılı vaatlerden kaçın, doğal ve profesyonel ton kullan
- Bölge ve konaklama deneyimini öne çıkar
- Sadece HTML içeriği döndür, açıklama veya markdown kullanma`;
}

export function generateVillaDescriptionTemplate(
  context: VillaDescriptionContext
): string {
  const typeLabel = facilityTypeLabel(context.facilityType);
  const region = context.region || context.location;
  const amenityList = context.amenities.slice(0, 8);

  const paragraphs = [
    `<p><strong>${context.name}</strong>, ${region} bölgesinde konforlu bir ${typeLabel.toLowerCase()} konaklama deneyimi sunar. ${context.guests} kişiye kadar misafir ağırlayabilen evimiz; ${context.bedrooms} yatak odası ve ${context.bathrooms} banyo ile geniş ve düzenli bir yaşam alanı sağlar.</p>`,
    context.livingRooms > 0
      ? `<p>Geniş salon alanı ve ferah iç mekân düzeni sayesinde aileler ve arkadaş grupları için ideal bir tatil ortamı sunulur. Bölgenin doğal güzellikleri ve çevredeki aktivite imkânları konaklamanızı daha keyifli hale getirir.</p>`
      : `<p>Modern iç mekân düzeni ve işlevsel yaşam alanları sayesinde aileler ve arkadaş grupları için ideal bir tatil ortamı sunulur. Bölgenin doğal güzellikleri ve çevredeki aktivite imkânları konaklamanızı daha keyifli hale getirir.</p>`,
    context.childFriendly
      ? `<p>Çocuk dostu yapısıyla aile tatilleri için uygun bir seçenektir. Güvenli ve huzurlu bir ortamda unutulmaz anılar biriktirebilirsiniz.</p>`
      : `<p>Huzurlu ve konforlu bir ortamda dinlenmek, bölgeyi keşfetmek ve kaliteli zaman geçirmek isteyen misafirler için ideal bir tercihtir.</p>`,
  ];

  const listItems =
    amenityList.length > 0
      ? `<h2>Öne Çıkan Özellikler</h2><ul>${amenityList.map((item) => `<li>${item}</li>`).join("")}</ul>`
      : "";

  const extra = context.extraInfo.trim()
    ? `<p>${context.extraInfo.trim()}</p>`
    : "";

  return `${paragraphs.join("")}${listItems}${extra}`;
}

export function parseVillaDescriptionAiResponse(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const htmlMatch = trimmed.match(/<[\s\S]+>/);
  if (htmlMatch) return htmlMatch[0].trim();

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block}</p>`)
    .join("");

  return paragraphs || null;
}
