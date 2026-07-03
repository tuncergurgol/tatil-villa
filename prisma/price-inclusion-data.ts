import type { PriceInclusionType } from "@prisma/client";

export interface PriceInclusionSeedItem {
  description: string;
  type: PriceInclusionType;
  isDefault?: boolean;
}

export const PRICE_INCLUSION_SEED_DATA: PriceInclusionSeedItem[] = [
  {
    description: "Tatil, Seyahat ve Sağlık Sigortası",
    type: "EXCLUDED",
  },
  {
    description: "Ekstra Tekstil Ürünleri",
    type: "EXCLUDED",
  },
  {
    description: "Ekstra Temizlik",
    type: "EXCLUDED",
  },
  {
    description: "Hava Alanı / Otogar / Liman Transferi",
    type: "EXCLUDED",
  },
  {
    description: "Uçak Bileti / Otobüs Bileti vb.",
    type: "EXCLUDED",
  },
  {
    description: "Havuz ve Bahçe Bakımı",
    type: "INCLUDED",
    isDefault: true,
  },
  {
    description: "Tüp Gaz / Doğal Gaz Kullanımı",
    type: "EXCLUDED",
  },
  {
    description: "Su Kullanımı",
    type: "INCLUDED",
    isDefault: true,
  },
  {
    description: "İnternet Kullanımı",
    type: "INCLUDED",
    isDefault: true,
  },
  {
    description: "Elektrik Kullanımı",
    type: "INCLUDED",
    isDefault: true,
  },
];
