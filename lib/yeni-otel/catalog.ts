export type HotelBoard = {
  id: string;
  label: string;
  /** Yetişkin başı, gece başına ek tutar. Örnek tarife. */
  adultNightlyExtra: number;
};

export type HotelRoom = {
  id: string;
  name: string;
  summary: string;
  sizeM2: number;
  maxGuests: number;
  beds: string[];
  features: string[];
  /** Oda başına gecelik örnek tarife (sadece oda). */
  nightly: {
    summer: number;
    winter: number;
    shoulder: number;
  };
};

export type HotelProperty = {
  slug: string;
  name: string;
  location: string;
  address: string;
  licenseNo: string;
  checkIn: string;
  checkOut: string;
  description: string;
  highlights: string[];
  concepts: string[];
  boards: HotelBoard[];
  rooms: HotelRoom[];
  facilities: Array<{ title: string; items: string[] }>;
  distances: Array<{ label: string; value: string }>;
  notes: string[];
  faqs: Array<{ question: string; answer: string }>;
};

export const YENI_OTEL_PATH = "/yeni-otel";

export const KIVANC_TATIL_KOYU: HotelProperty = {
  slug: "kivanc-tatil-koyu",
  name: "Kıvanç Tatil Köyü",
  location: "Ölüdeniz, Fethiye",
  address: "Ölüdeniz Mah. Likya Yolu Cad. Orman Yolu No:14, Fethiye / Muğla",
  licenseNo: "26674",
  checkIn: "15:00",
  checkOut: "12:00",
  description:
    "Hisarönü ve Ölüdeniz arasında, Babadağ manzaralı müstakil villalardan oluşan tesis. Hisarönü merkeze yürüyüş mesafesinde; açık havuzlar 1 Nisan – 31 Ekim arasında hizmet verir.",
  highlights: ["Açık havuz", "Müstakil villa", "Doğa içinde", "Özel havuz seçenekleri"],
  concepts: ["Sadece oda", "Kahvaltı dahil"],
  boards: [
    { id: "room-only", label: "Sadece oda", adultNightlyExtra: 0 },
    { id: "breakfast", label: "Kahvaltı dahil", adultNightlyExtra: 850 },
  ],
  rooms: [
    {
      id: "dag-manzarali-jakuzi",
      name: "Özel Havuzlu Villa, Dağ Manzaralı, Jakuzili",
      summary: "Çift ve küçük aileler için jakuzili, özel havuzlu villa.",
      sizeM2: 60,
      maxGuests: 3,
      beds: ["Queen yatak", "Kanepe", "Çekyat"],
      features: ["Özel havuz", "Jakuzi", "Dağ manzarası", "Klima"],
      nightly: { summer: 8200, winter: 7200, shoulder: 6750 },
    },
    {
      id: "bahceli-ozel-havuz",
      name: "Özel Havuzlu ve Bahçeli Villa",
      summary: "Dağ veya havuz manzaralı, müstakil bahçeli villa.",
      sizeM2: 95,
      maxGuests: 4,
      beds: ["Çift kişilik yatak", "Tek kişilik yatak", "Kanepe"],
      features: ["Özel havuz", "Müstakil bahçe", "Oturma alanı", "Klima"],
      nightly: { summer: 10900, winter: 9400, shoulder: 8900 },
    },
    {
      id: "aile-villasi",
      name: "Aileye Özel Villa",
      summary: "Bahçe veya dağ manzaralı, geniş aile konaklaması.",
      sizeM2: 150,
      maxGuests: 6,
      beds: ["Geniş çift kişilik yatak"],
      features: ["Aileye özel", "Bahçe veya dağ manzarası", "Geniş yaşam alanı"],
      nightly: { summer: 15600, winter: 13200, shoulder: 12400 },
    },
  ],
  facilities: [
    {
      title: "Tesis",
      items: [
        "Açık havuz",
        "Otopark",
        "Wi-Fi",
        "24 saat resepsiyon",
        "Güvenlik",
        "Bahçe",
        "Lobi",
      ],
    },
    {
      title: "Ücretli hizmetler",
      items: ["Jakuzi", "Çamaşırhane", "Tekne turu"],
    },
  ],
  distances: [
    { label: "Babadağ Teleferik", value: "3 km" },
    { label: "Ölüdeniz", value: "6 km" },
    { label: "Fethiye otogar", value: "9 km" },
    { label: "Kelebekler Vadisi", value: "12 km" },
    { label: "Çalış Plajı", value: "16 km" },
    { label: "Dalaman Havalimanı", value: "60 km" },
  ],
  notes: [
    "Giriş 15:00, çıkış 12:00.",
    "Evcil hayvan kabul edilir.",
    "Örnek tutar konaklama bedelidir. Kesin fiyat, müsaitlik onayından sonra netleşir.",
    "Talep sonrası ödemenin yarısı ayrılır; kalan tutar girişten 7 gün öncesine kadar tamamlanır.",
  ],
  faqs: [
    {
      question: "Hangi konseptler var?",
      answer: "Sadece oda ve kahvaltı dahil. Kahvaltı, yetişkin başı gecelik ek tutarla hesaplanır.",
    },
    {
      question: "Fiyat ne zaman görünür?",
      answer:
        "Giriş, çıkış ve kişi sayısı seçilince oda kartında gece sayısı ve örnek toplam tutar çıkar.",
    },
    {
      question: "Rezervasyon nasıl tamamlanır?",
      answer:
        "Odayı seçip talep bırakırsınız. Ekibimiz müsaitliği doğrular ve sizi arar. Ödeme bu sayfada alınmaz.",
    },
  ],
};

export const YENI_OTELLER: HotelProperty[] = [KIVANC_TATIL_KOYU];

export function seasonOf(isoDate: string): keyof HotelRoom["nightly"] {
  const month = Number(isoDate.slice(5, 7));
  if (month >= 6 && month <= 9) return "summer";
  if (month >= 11 || month <= 3) return "winter";
  return "shoulder";
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

export function quoteStay(input: {
  room: HotelRoom;
  board: HotelBoard;
  checkIn: string;
  nights: number;
  adults: number;
  roomCount: number;
}) {
  const season = seasonOf(input.checkIn);
  const roomNightly = input.room.nightly[season];
  const roomTotal = roomNightly * input.nights * input.roomCount;
  const boardTotal =
    input.board.adultNightlyExtra * input.adults * input.nights;
  return {
    season,
    roomNightly,
    roomTotal,
    boardTotal,
    total: roomTotal + boardTotal,
  };
}

export function formatTry(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}
