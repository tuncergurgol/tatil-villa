export const FAQ_CATEGORY_LABELS: Record<string, string> = {
  genel: "Genel",
  rezervasyon: "Rezervasyon",
  odeme: "Ödeme",
  "villa-konaklama": "Villa & Konaklama",
  "iptal-iade": "İptal & İade",
  "bolge-tatil": "Bölge & Tatil",
  guvenlik: "Güvenlik",
};

export const FAQ_CATEGORY_ORDER = [
  "genel",
  "rezervasyon",
  "odeme",
  "villa-konaklama",
  "iptal-iade",
  "bolge-tatil",
  "guvenlik",
] as const;

export function getFaqCategoryLabel(category: string): string {
  return FAQ_CATEGORY_LABELS[category] ?? category;
}
