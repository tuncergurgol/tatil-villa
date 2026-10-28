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
  Domes: "Dome stays",
};

const DE_LABELS: Record<string, string> = {
  "Özel Havuzlu": "mit privatem Pool",
  "Isıtmalı Havuzlu": "mit beheiztem Pool",
  "Kapalı Havuzlu": "mit Innenpool",
  "Deniz Manzarası": "Meerblick",
  "Denize Yakın": "nah am Meer",
  "Doğa Manzarası": "Naturblick",
  Jakuzili: "mit Jacuzzi",
  "Balayı için ideal": "für die Hochzeitsreise",
  "Geniş Aileler ve Gruplar İçin": "für große Familien und Gruppen",
  "Evcil Hayvan Dostu": "haustierfreundlich",
  Şömine: "Kamin",
  Klima: "Klimaanlage",
  "Wi-Fi": "WLAN",
  Wifi: "WLAN",
  Otopark: "Parkplatz",
  "Özel Otopark": "privater Parkplatz",
  Barbekü: "Grill",
  Havuz: "Pool",
  "Özel Havuz": "Privater Pool",
  "Isıtmalı Havuz": "Beheizter Pool",
  "Çocuk Havuzu": "Kinderpool",
  Jakuzi: "Jacuzzi",
  Teras: "Terrasse",
  Bahçe: "Garten",
  Kamelya: "Pavillon",
  "Dalaman Havalimanı": "Flughafen Dalaman",
  "Antalya Havalimanı": "Flughafen Antalya",
  Market: "Supermarkt",
  Restoran: "Restaurant",
  Bungalov: "Bungalow",
  Domes: "Kuppelhäuser",
};

const FR_LABELS: Record<string, string> = {
  "Özel Havuzlu": "avec piscine privée",
  "Isıtmalı Havuzlu": "avec piscine chauffée",
  "Deniz Manzarası": "vue mer",
  "Denize Yakın": "près de la mer",
  Jakuzili: "avec jacuzzi",
  "Isıtmalı Havuz": "Piscine chauffée",
  "Özel Havuz": "Piscine privée",
  Klima: "climatisation",
  "Wi-Fi": "Wi-Fi",
  Kamelya: "tonnelle",
  "Dalaman Havalimanı": "aéroport de Dalaman",
  "Antalya Havalimanı": "aéroport d'Antalya",
  Bungalov: "Bungalow",
  Domes: "Dômes",
};

const ES_LABELS: Record<string, string> = {
  "Özel Havuzlu": "con piscina privada",
  "Isıtmalı Havuzlu": "con piscina climatizada",
  "Deniz Manzarası": "vistas al mar",
  "Denize Yakın": "cerca del mar",
  Jakuzili: "con jacuzzi",
  "Isıtmalı Havuz": "Piscina climatizada",
  "Özel Havuz": "Piscina privada",
  Klima: "aire acondicionado",
  Kamelya: "cenador",
  "Dalaman Havalimanı": "aeropuerto de Dalaman",
  "Antalya Havalimanı": "aeropuerto de Antalya",
  Bungalov: "Bungalow",
  Domes: "Cúpulas",
};

const RU_LABELS: Record<string, string> = {
  "Özel Havuzlu": "с частным бассейном",
  "Isıtmalı Havuzlu": "с подогреваемым бассейном",
  "Deniz Manzarası": "вид на море",
  "Denize Yakın": "рядом с морем",
  Jakuzili: "с джакузи",
  "Isıtmalı Havuz": "Подогреваемый бассейн",
  "Özel Havuz": "Частный бассейн",
  Klima: "кондиционер",
  Kamelya: "беседка",
  "Dalaman Havalimanı": "аэропорт Даламан",
  "Antalya Havalimanı": "аэропорт Анталья",
  Bungalov: "Бунгало",
  Domes: "Купольные дома",
};

const BG_LABELS: Record<string, string> = {
  "Özel Havuzlu": "с частен басейн",
  "Isıtmalı Havuzlu": "с отопляем басейн",
  "Isıtmalı Havuz": "Отопляем басейн",
  "Özel Havuz": "Частен басейн",
  "Deniz Manzarası": "гледка към морето",
  Kamelya: "беседка",
  "Dalaman Havalimanı": "летище Даламан",
  Bungalov: "Бунгало",
  Domes: "Куполни къщи",
};

const EL_LABELS: Record<string, string> = {
  "Özel Havuzlu": "με ιδιωτική πισίνα",
  "Isıtmalı Havuzlu": "με θερμαινόμενη πισίνα",
  "Isıtmalı Havuz": "Θερμαινόμενη πισίνα",
  "Özel Havuz": "Ιδιωτική πισίνα",
  "Deniz Manzarası": "θέα στη θάλασσα",
  Kamelya: "κιόσκι",
  "Dalaman Havalimanı": "αεροδρόμιο Dalaman",
  Bungalov: "Μπανγκαλόου",
  Domes: "Θόλοι",
};

const ZH_LABELS: Record<string, string> = {
  "Özel Havuzlu": "带私人泳池",
  "Isıtmalı Havuzlu": "带恒温泳池",
  "Isıtmalı Havuz": "恒温泳池",
  "Özel Havuz": "私人泳池",
  "Deniz Manzarası": "海景",
  Kamelya: "凉亭",
  "Dalaman Havalimanı": "达拉曼机场",
  "Antalya Havalimanı": "安塔利亚机场",
  Bungalov: "平房",
  Domes: "穹顶屋",
};

const LOCALE_LABELS: Record<string, Record<string, string>> = {
  de: DE_LABELS,
  fr: FR_LABELS,
  es: ES_LABELS,
  ru: RU_LABELS,
  bg: BG_LABELS,
  el: EL_LABELS,
  zh: ZH_LABELS,
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
  return LOCALE_LABELS[locale]?.[key] ?? EN_LABELS[key] ?? label;
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
