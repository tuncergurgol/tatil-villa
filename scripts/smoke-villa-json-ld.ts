/**
 * VacationRental JSON-LD smoke test.
 * Çalıştır: npx tsx scripts/smoke-villa-json-ld.ts
 */
import { buildVillaLodgingJsonLd } from "../lib/villa-json-ld";

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`ok — ${label}`);
}

const villa = {
  id: "villa-test-id",
  villaCode: "1001",
  slug: "villa-test",
  name: "Villa Test",
  category: "villa" as const,
  location: "Kalkan Merkez",
  regionLabel: "Antalya - Kaş - Kalkan",
  regionAddress: {
    il: "Antalya",
    ilce: "Kaş",
    mahalle: "Kalkan",
  },
  regionImage: "/uploads/regions/kalkan.webp",
  guests: 6,
  extraCapacity: 2,
  bedrooms: 3,
  bathrooms: 2,
  livingRooms: 1,
  pricePerNight: 12000,
  images: Array.from({ length: 3 }, (_, i) => `/uploads/villas/test-${i + 1}.webp`),
  image: "/uploads/villas/test-1.webp",
  description: "",
  amenities: ["Klima", "WiFi", "Özel Havuz", "Denize Yakın"],
  facilityCategories: ["Villa"],
  latitude: 36.26455,
  longitude: 29.41312,
  hasCoords: true,
  checkInTime: "16:00",
  checkOutTime: "10:00",
  seoDescription: "",
  rooms: [
    {
      id: "r1",
      name: "Yatak Odası 1",
      roomType: "yatak_odasi",
      roomTypeLabel: "Yatak Odası",
      bedSummary: "1 çift kişilik",
      singleBeds: 0,
      doubleBeds: 1,
      imageUrl: "/uploads/villas/room-1.webp",
      features: [],
    },
  ],
  reviews: [
    {
      id: "rev1",
      guestName: "Ayşe Y.",
      rating: 5,
      title: "Harika tatil",
      comment: "Villa çok temiz ve konforluydu.",
      stayMonth: "Temmuz 2025",
      createdAt: "2025-07-15T10:00:00.000Z",
    },
  ],
  reviewCount: 12,
  averageRating: 4.8,
} as const;

const jsonLd = buildVillaLodgingJsonLd({
  villa: villa as never,
  brandName: "Tatildeyiz",
  origin: "https://www.tatildeyiz.com.tr",
  brandOgImage: "/brands/tatil-villacisi/og-image.png",
});

assert(Boolean(jsonLd), "JSON-LD üretildi");
assert(jsonLd?.["@type"] === "VacationRental", "VacationRental tipi");
assert(jsonLd?.additionalType === "Villa", "additionalType var");
assert(Boolean(jsonLd?.description), "description var");
assert(Boolean(jsonLd?.containsPlace), "containsPlace var");
assert(
  (jsonLd?.containsPlace as { "@type"?: string })?.["@type"] === "Accommodation",
  "containsPlace Accommodation"
);
assert(
  Number(
    (jsonLd?.containsPlace as { occupancy?: { value?: number } })?.occupancy
      ?.value
  ) === 8,
  "occupancy.value doğru"
);
assert(
  Array.isArray(jsonLd?.image) && (jsonLd?.image as string[]).length >= 8,
  "en az 8 görsel"
);
assert(
  new Set(jsonLd?.image as string[]).size >= 8,
  "görseller benzersiz URL"
);
assert(Boolean(jsonLd?.identifier), "identifier var");
assert(Boolean(jsonLd?.latitude && jsonLd?.longitude), "koordinat var");

const address = jsonLd?.address as {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
};
assert(Boolean(address?.streetAddress), "streetAddress var");
assert(Boolean(address?.addressLocality), "addressLocality var");
assert(Boolean(address?.addressRegion), "addressRegion var");
assert(Boolean(address?.postalCode), "postalCode var");
assert(Boolean(jsonLd?.aggregateRating), "aggregateRating var");
assert(Array.isArray(jsonLd?.review) && (jsonLd?.review as unknown[]).length > 0, "review var");

console.log("\nTüm VacationRental JSON-LD smoke senaryoları geçti.");
