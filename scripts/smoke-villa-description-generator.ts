/**
 * Villa açıklama üretici smoke testi.
 *
 *   npx tsx scripts/smoke-villa-description-generator.ts
 */
import {
  buildVillaDescriptionPreview,
  buildVillaDescriptionPrompt,
  generateVillaDescriptionTemplate,
  type VillaDescriptionContext,
} from "../lib/villa-description-generator";

const sampleContext: VillaDescriptionContext = {
  name: "Villa King Dome A/1",
  region: "Antalya - Kaş - İslamlar",
  regionMahalle: "İslamlar",
  regionIlce: "Kaş",
  regionIl: "Antalya",
  extraInfo: "",
  facilityType: "villa",
  guests: 2,
  extraCapacity: 0,
  livingRooms: 0,
  bedrooms: 1,
  bathrooms: 1,
  amenityCount: 12,
  childFriendly: false,
  allowPets: false,
  allowSmoking: false,
  customRules: ["Mangal yalnızca tüplü mangal ile yapılabilir"],
  minStayNights: 3,
  featuredAmenities: [
    "Özel Havuz",
    "Jakuzi",
    "Klima",
    "Akıllı TV",
    "Kamelya",
    "WiFi",
    "Özel Otopark",
  ],
  amenities: ["Bulaşık Makinesi", "Mini Buzdolabı"],
  location: "İslamlar Köyü, doğa içinde konum",
  distances: [
    { category: "Yakın Yerler", name: "Kalkan Merkez", distanceLabel: "7 km" },
    {
      category: "Yakın Yerler",
      name: "İslamlar Köyü Merkezi",
      distanceLabel: "1.5 km",
    },
    { category: "Ulaşım", name: "Market", distanceLabel: "800 metre" },
  ],
};

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  const preview = buildVillaDescriptionPreview(sampleContext);
  assert(preview.featuredAmenities.length === 7, "featured amenities");
  assert(preview.distances.length === 3, "distances");
  assert(preview.minStayNights === 3, "min stay");
  assert(preview.capacitySummary.includes("1+0"), "capacity summary");

  const template = generateVillaDescriptionTemplate(sampleContext);
  assert(template.includes("<p>"), "template html");
  assert(template.includes("Villa King Dome A/1"), "template name");
  assert(template.includes("Kamelya"), "template standout");
  assert(template.includes("7 km"), "template distance");
  assert(template.includes("3 gecedir"), "template min stay");

  const prompt = buildVillaDescriptionPrompt(sampleContext);
  assert(prompt.includes("ÖNE ÇIKANLAR"), "prompt featured section");
  assert(prompt.includes("SEO"), "prompt seo guidance");
  assert(prompt.includes("sıcak"), "prompt tone guidance");

  console.log(
    JSON.stringify(
      {
        previewWarnings: preview.warnings,
        templateParagraphCount: (template.match(/<p>/g) ?? []).length,
        templateLength: template.length,
      },
      null,
      2
    )
  );
  console.log("smoke-villa-description-generator: OK");
}

main();
