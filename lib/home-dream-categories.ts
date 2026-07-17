/**
 * Anasayfa “Nasıl bir tatil hayal ediyorsunuz?” kartları.
 * Her kart Admin → Ev Kategorileri (FacilityCategory) slug’ına bağlanır.
 * Kategori yoksa amenity adı ile gelişmiş aramaya fallback yapılır.
 */

export type HomeDreamCategoryCard = {
  title: string;
  image: string;
  href: string;
};

export type HomeDreamCategoryCardDef = {
  /** Kart üstündeki kısa etiket */
  title: string;
  /** FacilityCategory.slug */
  facilitySlug: string;
  /** Kategori DB’de yoksa /villalar?amenities=… fallback */
  amenityFallback?: string;
  /** Kategori görseli boşsa */
  fallbackImage: string;
};

export const HOME_DREAM_CATEGORY_CARDS: HomeDreamCategoryCardDef[] = [
  {
    title: "Havuzu dışarıdan görünmeyen",
    facilitySlug: "muhafazakar-villalar",
    fallbackImage:
      "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=600&q=80",
  },
  {
    title: "Isıtmalı havuzlu",
    facilitySlug: "isitmali-havuzlu-villalar",
    amenityFallback: "Isıtmalı Havuz",
    fallbackImage:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80",
  },
  {
    title: "Balayı için ideal",
    facilitySlug: "balayi-villalari",
    fallbackImage:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
  },
  {
    title: "Geniş bahçesi olan",
    facilitySlug: "genis-bahceli-villalar",
    amenityFallback: "Bahçe",
    fallbackImage:
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=600&q=80",
  },
  {
    title: "Eğlence ve aktivite imkanlı",
    facilitySlug: "eglence-ve-aktivite-imkanli-villalar",
    amenityFallback: "Bilardo",
    fallbackImage:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
  },
  {
    title: "Deniz manzaralı",
    facilitySlug: "deniz-manzarali-villalar",
    fallbackImage:
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600&q=80",
  },
  {
    title: "Evcil hayvan dostu",
    facilitySlug: "kopek-kabul-eden-villalar",
    amenityFallback: "Evcil Hayvan İzinli",
    fallbackImage:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80",
  },
];

/** Gelişmiş villa arama — Ev Kategorisi (facilities adı) */
export function buildDreamFacilitySearchHref(facilityName: string) {
  const params = new URLSearchParams({
    facilities: facilityName,
  });
  return `/villalar?${params.toString()}`;
}

/** Gelişmiş villa arama — olanak (amenities adı) fallback */
export function buildDreamAmenitySearchHref(amenityName: string) {
  const params = new URLSearchParams({
    amenities: amenityName,
  });
  return `/villalar?${params.toString()}`;
}
