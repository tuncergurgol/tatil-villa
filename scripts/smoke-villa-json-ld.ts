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
  location: "Kalkan",
  regionLabel: "Antalya - Kalkan",
  guests: 6,
  extraCapacity: 2,
  bedrooms: 3,
  bathrooms: 2,
  livingRooms: 1,
  pricePerNight: 12000,
  images: Array.from({ length: 3 }, (_, i) => `/uploads/villas/test-${i + 1}.webp`),
  image: "/uploads/villas/test-1.webp",
  description: "<p>Test açıklama</p>",
  amenities: ["Klima", "WiFi", "Özel Havuz", "Denize Yakın"],
  facilityCategories: ["Villa"],
  latitude: 36.26455,
  longitude: 29.41312,
  hasCoords: true,
  checkInTime: "16:00",
  checkOutTime: "10:00",
  seoDescription: "SEO açıklama",
  rooms: [
    {
      id: "r1",
      name: "Yatak Odası 1",
      roomType: "yatak_odasi",
      roomTypeLabel: "Yatak Odası",
      bedSummary: "1 çift kişilik",
      singleBeds: 0,
      doubleBeds: 1,
      imageUrl: "",
      features: [],
    },
  ],
  reviews: [],
  reviewCount: 0,
  averageRating: null,
} as const;

const jsonLd = buildVillaLodgingJsonLd({
  villa: villa as never,
  brandName: "Tatildeyiz",
  origin: "https://www.tatildeyiz.com.tr",
});

assert(Boolean(jsonLd), "JSON-LD üretildi");
assert(jsonLd?.["@type"] === "VacationRental", "VacationRental tipi");
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
assert(Boolean(jsonLd?.identifier), "identifier var");
assert(Boolean(jsonLd?.latitude && jsonLd?.longitude), "koordinat var");

console.log("\nTüm VacationRental JSON-LD smoke senaryoları geçti.");
