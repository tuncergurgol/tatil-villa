import type { AppLocale } from "@/i18n/routing";

export type VillaSearchMessages = {
  priceRange: string;
  region: string;
  amenities: string;
  applyPrice: string;
  minPlaceholder: string;
  maxPlaceholder: string;
  foundFor: string;
  foundCount: string;
  priceGuarantee: string;
  showingFirst: string;
  showingRange: string;
  pageOf: string;
  availableOnly: string;
  datesSelected: string;
  selectDates: string;
  sortRecommended: string;
  sortRandom: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  sortGuests: string;
  noResults: string;
  tryFilters: string;
  pagination: string;
  preApproved: string;
  nightly: string;
  nightsCount: string;
  reservationTotal: string;
  perNight: string;
};

const tr: VillaSearchMessages = {
  priceRange: "Fiyat Aralığı",
  region: "Bölge",
  amenities: "Olanaklar",
  applyPrice: "Fiyat uygula",
  minPlaceholder: "Min.",
  maxPlaceholder: "Maks.",
  foundFor: "{title} için toplam",
  foundCount: "{count} tesis bulduk!",
  priceGuarantee: "Fiyat ve İndirimler / En İyi Fiyat Garantisi",
  showingFirst: "İlk {count} sonuç gösteriliyor",
  showingRange: "{start}–{end} arası gösteriliyor",
  pageOf: "(sayfa {page}/{total})",
  availableOnly: "Sadece müsait tesisleri göster",
  datesSelected: "(tarih seçili)",
  selectDates: "(tarih seçin)",
  sortRecommended: "Önerilen Sıralama",
  sortRandom: "Karışık",
  sortPriceAsc: "Fiyat (Artan)",
  sortPriceDesc: "Fiyat (Azalan)",
  sortGuests: "Kapasite",
  noResults: "Sonuç bulunamadı",
  tryFilters: "Filtreleri değiştirerek tekrar deneyin.",
  pagination: "Sayfalama",
  preApproved: "Ön Onaylı Rezervasyon",
  nightly: "Gecelik",
  nightsCount: "{count} Gece",
  reservationTotal: "Rezervasyon Toplamı",
  perNight: "/ Gece",
};

const en: VillaSearchMessages = {
  priceRange: "Price Range",
  region: "Region",
  amenities: "Amenities",
  applyPrice: "Apply price",
  minPlaceholder: "Min.",
  maxPlaceholder: "Max.",
  foundFor: "We found a total of",
  foundCount: "{count} properties for {title}!",
  priceGuarantee: "Prices & Discounts / Best Price Guarantee",
  showingFirst: "Showing first {count} results",
  showingRange: "Showing {start}–{end}",
  pageOf: "(page {page}/{total})",
  availableOnly: "Show only available properties",
  datesSelected: "(dates selected)",
  selectDates: "(select dates)",
  sortRecommended: "Recommended",
  sortRandom: "Mixed",
  sortPriceAsc: "Price (Low to High)",
  sortPriceDesc: "Price (High to Low)",
  sortGuests: "Capacity",
  noResults: "No results found",
  tryFilters: "Try changing the filters.",
  pagination: "Pagination",
  preApproved: "Pre-approved booking",
  nightly: "Nightly",
  nightsCount: "{count} Nights",
  reservationTotal: "Reservation Total",
  perNight: "/ night",
};

export const villaSearchMessages: Record<AppLocale, VillaSearchMessages> = {
  tr,
  en,
  de: en,
  fr: en,
  es: en,
  bg: en,
  el: en,
  zh: en,
};
