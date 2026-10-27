/** CMS / katalog etiketlerini (olanak, özellik, mesafe kategorisi) dile çevir. */

const EN_LABELS: Record<string, string> = {
  // Öne çıkan / tesis özellikleri
  "Arkadaş Grubu Kabul Eden": "Friends groups welcome",
  "Deniz Manzarası": "Sea view",
  "Denize Yakın": "Near the sea",
  "Doğa Manzarası": "Nature view",
  "Geniş Aileler ve Gruplar İçin": "Ideal for large families and groups",
  "Merkeze Yakın": "Close to center",
  "Özel Havuzlu": "Private pool",
  "Isıtmalı Havuzlu": "Heated pool",
  "Kapalı Havuzlu": "Indoor pool",
  "Jakuzili": "With jacuzzi",
  "Sauna ve Hamamlı": "Sauna and hammam",
  "Balayı için ideal": "Ideal for honeymoon",
  "Evcil Hayvan Dostu": "Pet friendly",
  "Köpek Kabul Eden": "Dogs welcome",
  "Havuzu dışarıdan görünmeyen": "Secluded pool",
  Muhafazakar: "Secluded / private",
  "Muhafazakar Villalar": "Secluded villas",

  // Oda özellikleri
  Balkon: "Balcony",
  "Elbise Dolabı": "Wardrobe",
  "Havlu & Nevresim": "Towels & linens",
  Klima: "Air conditioning",
  "Özel Banyo": "En-suite bathroom",
  "Ortak Banyo": "Shared bathroom",
  "Bebek Yatağı": "Baby cot",
  Televizyon: "Television",
  Teras: "Terrace",
  Şömine: "Fireplace",
  Jakuzi: "Jacuzzi",
  Sauna: "Sauna",
  "Türk Hamamı": "Turkish bath",
  "Kapalı Havuz": "Indoor pool",
  "Ana Bina Dışında Bağımsız Oda": "Detached room outside main building",
  "Çift Kişilik Yatak": "Double bed",
  "Tek Kişilik Yatak": "Single bed",
  "Yatak Odası": "Bedroom",
  Salon: "Living room",
  Mutfak: "Kitchen",
  Banyo: "Bathroom",

  // Genel olanaklar
  Genel: "General",
  Bahçe: "Garden",
  "Çamaşır Makinesi": "Washing machine",
  "Teras Alanı": "Terrace area",
  "Ütü Masası": "Ironing board",
  "Bulaşık Makinesi": "Dishwasher",
  "Wi-Fi": "Wi-Fi",
  Wifi: "Wi-Fi",
  İnternet: "Internet",
  Otopark: "Parking",
  "Özel Otopark": "Private parking",
  Barbekü: "Barbecue",
  "Masa Tenisi": "Table tennis",
  Bilardo: "Billiards",

  // Mesafe kategorileri
  "Yakın Yerler": "Nearby Places",
  Ulaşım: "Transport",
  "Popüler Yerler": "Popular Places",
  Diğer: "Other",

  // Mesafe noktaları (özel yer adları korunur; genel etiketler çevrilir)
  Market: "Market",
  Restaurant: "Restaurant",
  Restoran: "Restaurant",
  Otogar: "Bus station",
  "Kalkan Otogarı": "Kalkan Bus Station",
  "Dalaman Havalimanı": "Dalaman Airport",
  "Antalya Havalimanı": "Antalya Airport",
  "Kaş Devlet Hastanesi": "Kaş State Hospital",
  "Kalkan Halk Plajı": "Kalkan Public Beach",

  // Ücrete dahil
  "Elektrik Kullanımı": "Electricity",
  "Havuz ve Bahçe Bakımı": "Pool and garden maintenance",
  "İnternet Kullanımı": "Internet usage",
  "Su Kullanımı": "Water usage",
  "Tüp Gaz / Doğal Gaz Kullanımı": "Gas / natural gas usage",

  // Havuz tipleri sık görülenler
  Havuz: "Pool",
  "Özel Havuz": "Private pool",
  "Isıtmalı Havuz": "Heated pool",
  "Çocuk Havuzu": "Children's pool",

  // Ev tipi
  Apart: "Apartment",
  "Suit Daire": "Suite",
  Bungalov: "Bungalow",
};

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function localizeCatalogLabel(
  label: string,
  locale: string
): string {
  if (!label || locale === "tr") return label;
  const key = normalizeKey(label);
  return EN_LABELS[key] ?? label;
}

export function localizeCatalogLabels(
  labels: string[],
  locale: string
): string[] {
  return labels.map((label) => localizeCatalogLabel(label, locale));
}

/** "300 Metre" / "2.9 Km" gibi mesafe etiketlerini dile çevir. */
export function localizeDistanceLabel(
  label: string,
  locale: string,
  metersWord: string,
  kmWord: string
): string {
  if (locale === "tr") return label;
  return label
    .replace(/\bMetre\b/gi, metersWord)
    .replace(/\bKm\b/gi, kmWord);
}
