/** tatildeyiz.com.tr/arac-kiralama içeriğinden uyarlanan seed verisi */

export const CAR_RENTAL_PAGE_SETTINGS_SEED = {
  id: "default",
  heroBadge: "",
  heroTitle: "Araç Kiralamak Ne Kolaymış!",
  heroSubtitle: "Ara, karşılaştır, en uygun aracı bul.",
  sameLocationDefault: true,
  showSameLocationToggle: true,
  sameLocationLabel: "Aynı noktadan teslim",
  pickupLabel: "Alış Noktası",
  returnLabel: "Teslim Noktası",
  pickupDateLabel: "Alış Tarihi",
  returnDateLabel: "Teslim Tarihi",
  driverAgeLabel: "Sürücü Yaşı",
  driverAgeOptionsJson: JSON.stringify([
    "21-24 yaş",
    "25-69 yaş",
    "70+ yaş",
  ]),
  defaultDriverAge: "25-69 yaş",
  ctaText: "Araç Ara",
  rentalDaysHint: "",
  categoriesTitle: "Araç Kategorileri",
  categoriesSubtitle: "",
  locationsTitle: "Popüler Lokasyonlar",
  locationsSubtitle: "",
  criteriaTitle: "Sürücü Kriterleri",
  criteriaSubtitle: "",
} as const;

export const CAR_RENTAL_CATEGORIES_SEED = [
  { slug: "economy", name: "Economy", priceFrom: 2500, sortOrder: 0 },
  { slug: "standard", name: "Standard", priceFrom: 3800, sortOrder: 1 },
  { slug: "premium", name: "Premium", priceFrom: 5500, sortOrder: 2 },
  { slug: "suv", name: "SUV", priceFrom: 4200, sortOrder: 3 },
  { slug: "medium", name: "Medium", priceFrom: 6000, sortOrder: 4 },
  { slug: "small-suv", name: "Small SUV", priceFrom: 7500, sortOrder: 5 },
  { slug: "comfort", name: "Comfort", priceFrom: 9000, sortOrder: 6 },
] as const;

export const CAR_RENTAL_CRITERIA_SEED = [
  {
    title: "Yaş şartı",
    description:
      "Sürücü en az 21 yaşında olmalıdır. 21–24 ve 70+ yaş için genç/kıdemli sürücü ücreti uygulanabilir.",
    icon: "user",
    sortOrder: 0,
  },
  {
    title: "Ehliyet",
    description:
      "En az 1 yıldır geçerli B sınıfı ehliyet zorunludur. Yabancı sürücüler için uluslararası ehliyet önerilir.",
    icon: "id-card",
    sortOrder: 1,
  },
  {
    title: "Kredi kartı",
    description:
      "Araç tesliminde sürücü adına kredi kartı ile depozito blokesi gerekir. Ön ödemeli kartlar kabul edilmez.",
    icon: "credit-card",
    sortOrder: 2,
  },
  {
    title: "Kimlik belgesi",
    description:
      "T.C. kimlik kartı veya geçerli pasaport ibraz edilmelidir.",
    icon: "badge-check",
    sortOrder: 3,
  },
  {
    title: "Sürücü kaydı",
    description:
      "Rezervasyondaki sürücü bilgileri ile teslim alan kişi aynı olmalıdır.",
    icon: "clipboard-check",
    sortOrder: 4,
  },
] as const;

/** Türkiye sivil havalimanları (IATA) — aktif/pasif admin’den yönetilir */
export const TURKEY_AIRPORTS_SEED: Array<{
  name: string;
  city: string;
  iataCode: string;
  vehicleCountHint?: string;
  isPopular?: boolean;
  sortOrder: number;
}> = [
  {
    name: "İstanbul Havalimanı",
    city: "İstanbul",
    iataCode: "IST",
    vehicleCountHint: "500+ Araç",
    isPopular: true,
    sortOrder: 0,
  },
  {
    name: "Sabiha Gökçen Havalimanı",
    city: "İstanbul",
    iataCode: "SAW",
    vehicleCountHint: "500+ Araç",
    isPopular: true,
    sortOrder: 1,
  },
  {
    name: "Antalya Havalimanı",
    city: "Antalya",
    iataCode: "AYT",
    vehicleCountHint: "350+ Araç",
    isPopular: true,
    sortOrder: 2,
  },
  {
    name: "Adnan Menderes Havalimanı",
    city: "İzmir",
    iataCode: "ADB",
    vehicleCountHint: "200+ Araç",
    isPopular: true,
    sortOrder: 3,
  },
  {
    name: "Milas-Bodrum Havalimanı",
    city: "Bodrum",
    iataCode: "BJV",
    vehicleCountHint: "180+ Araç",
    isPopular: true,
    sortOrder: 4,
  },
  {
    name: "Dalaman Havalimanı",
    city: "Dalaman",
    iataCode: "DLM",
    vehicleCountHint: "150+ Araç",
    isPopular: true,
    sortOrder: 5,
  },
  {
    name: "Esenboğa Havalimanı",
    city: "Ankara",
    iataCode: "ESB",
    vehicleCountHint: "120+ Araç",
    isPopular: true,
    sortOrder: 6,
  },
  {
    name: "Adana Şakirpaşa Havalimanı",
    city: "Adana",
    iataCode: "ADA",
    sortOrder: 10,
  },
  {
    name: "Gazipaşa-Alanya Havalimanı",
    city: "Alanya",
    iataCode: "GZP",
    sortOrder: 11,
  },
  {
    name: "Trabzon Havalimanı",
    city: "Trabzon",
    iataCode: "TZX",
    sortOrder: 12,
  },
  {
    name: "Diyarbakır Havalimanı",
    city: "Diyarbakır",
    iataCode: "DIY",
    sortOrder: 13,
  },
  {
    name: "Erzurum Havalimanı",
    city: "Erzurum",
    iataCode: "ERZ",
    sortOrder: 14,
  },
  {
    name: "Gaziantep Havalimanı",
    city: "Gaziantep",
    iataCode: "GZT",
    sortOrder: 15,
  },
  {
    name: "Kayseri Erkilet Havalimanı",
    city: "Kayseri",
    iataCode: "ASR",
    sortOrder: 16,
  },
  {
    name: "Konya Havalimanı",
    city: "Konya",
    iataCode: "KYA",
    sortOrder: 17,
  },
  {
    name: "Malatya Havalimanı",
    city: "Malatya",
    iataCode: "MLX",
    sortOrder: 18,
  },
  {
    name: "Mardin Havalimanı",
    city: "Mardin",
    iataCode: "MQM",
    sortOrder: 19,
  },
  {
    name: "Nevşehir Kapadokya Havalimanı",
    city: "Nevşehir",
    iataCode: "NAV",
    sortOrder: 20,
  },
  {
    name: "Samsun Çarşamba Havalimanı",
    city: "Samsun",
    iataCode: "SZF",
    sortOrder: 21,
  },
  {
    name: "Van Ferit Melen Havalimanı",
    city: "Van",
    iataCode: "VAN",
    sortOrder: 22,
  },
  {
    name: "Hatay Havalimanı",
    city: "Hatay",
    iataCode: "HTY",
    sortOrder: 23,
  },
  {
    name: "Çanakkale Havalimanı",
    city: "Çanakkale",
    iataCode: "CKZ",
    sortOrder: 24,
  },
  {
    name: "Balıkesir Koca Seyit Havalimanı",
    city: "Edremit",
    iataCode: "EDO",
    sortOrder: 25,
  },
  {
    name: "Denizli Çardak Havalimanı",
    city: "Denizli",
    iataCode: "DNZ",
    sortOrder: 26,
  },
  {
    name: "Isparta Süleyman Demirel Havalimanı",
    city: "Isparta",
    iataCode: "ISE",
    sortOrder: 27,
  },
  {
    name: "Elazığ Havalimanı",
    city: "Elazığ",
    iataCode: "EZS",
    sortOrder: 28,
  },
  {
    name: "Ordu-Giresun Havalimanı",
    city: "Ordu",
    iataCode: "OGU",
    sortOrder: 29,
  },
  {
    name: "Kahramanmaraş Havalimanı",
    city: "Kahramanmaraş",
    iataCode: "KCM",
    sortOrder: 30,
  },
  {
    name: "Batman Havalimanı",
    city: "Batman",
    iataCode: "BAL",
    sortOrder: 31,
  },
  {
    name: "Şanlıurfa GAP Havalimanı",
    city: "Şanlıurfa",
    iataCode: "GNY",
    sortOrder: 32,
  },
  {
    name: "Zonguldak Çaycuma Havalimanı",
    city: "Zonguldak",
    iataCode: "ONQ",
    sortOrder: 33,
  },
  {
    name: "Sinop Havalimanı",
    city: "Sinop",
    iataCode: "NOP",
    sortOrder: 34,
  },
  {
    name: "Tokat Havalimanı",
    city: "Tokat",
    iataCode: "TJK",
    sortOrder: 35,
  },
  {
    name: "Amasya Merzifon Havalimanı",
    city: "Amasya",
    iataCode: "MZH",
    sortOrder: 36,
  },
  {
    name: "Kütahya Zafer Havalimanı",
    city: "Kütahya",
    iataCode: "KZR",
    sortOrder: 37,
  },
  {
    name: "Bursa Yenişehir Havalimanı",
    city: "Bursa",
    iataCode: "YEI",
    sortOrder: 38,
  },
  {
    name: "Çorlu Havalimanı",
    city: "Tekirdağ",
    iataCode: "TEQ",
    sortOrder: 39,
  },
  {
    name: "Rize-Artvin Havalimanı",
    city: "Rize",
    iataCode: "RZV",
    sortOrder: 40,
  },
  {
    name: "Kars Harakani Havalimanı",
    city: "Kars",
    iataCode: "KSY",
    sortOrder: 41,
  },
  {
    name: "Ağrı Ahmed-i Hani Havalimanı",
    city: "Ağrı",
    iataCode: "AJI",
    sortOrder: 42,
  },
  {
    name: "Iğdır Havalimanı",
    city: "Iğdır",
    iataCode: "IGD",
    sortOrder: 43,
  },
  {
    name: "Hakkari Yüksekova Havalimanı",
    city: "Hakkari",
    iataCode: "YKO",
    sortOrder: 44,
  },
  {
    name: "Siirt Havalimanı",
    city: "Siirt",
    iataCode: "SXZ",
    sortOrder: 45,
  },
  {
    name: "Bingöl Havalimanı",
    city: "Bingöl",
    iataCode: "BGG",
    sortOrder: 46,
  },
  {
    name: "Muş Havalimanı",
    city: "Muş",
    iataCode: "MSR",
    sortOrder: 47,
  },
  {
    name: "Sivas Nuri Demirağ Havalimanı",
    city: "Sivas",
    iataCode: "VAS",
    sortOrder: 48,
  },
  {
    name: "Erzincan Havalimanı",
    city: "Erzincan",
    iataCode: "ERC",
    sortOrder: 49,
  },
  {
    name: "Çukurova Uluslararası Havalimanı",
    city: "Adana",
    iataCode: "COV",
    sortOrder: 50,
  },
];
