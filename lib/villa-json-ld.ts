import type { VillaDetail } from "@/lib/queries/villa-detail";

type VillaJsonLdInput = {
  villa: VillaDetail;
  brandName: string;
  origin: string;
};

const GOOGLE_AMENITY_MAP: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /klima|air.?condition/i, name: "ac" },
  { pattern: /wifi|wi-?fi|internet|kablosuz/i, name: "wifi" },
  { pattern: /havuz/i, name: "pool" },
  { pattern: /otopark|park/i, name: "parking" },
  { pattern: /deniz|plaj|beach/i, name: "beachAccess" },
  { pattern: /balkon|teras/i, name: "balcony" },
  { pattern: /çocuk|bebek/i, name: "childFriendly" },
  { pattern: /jakuzi|jacuzzi/i, name: "jacuzzi" },
  { pattern: /barbek|bbq|mangal/i, name: "bbqGrill" },
  { pattern: /şömine|somine/i, name: "fireplace" },
  { pattern: /tv|televizyon/i, name: "tv" },
  { pattern: /çamaşır|camasir|washing/i, name: "washer" },
  { pattern: /bulaşık|bulasik|dishwasher/i, name: "dishwasher" },
  { pattern: /evcil|pet/i, name: "petsAllowed" },
  { pattern: /asansör|asansor|elevator/i, name: "elevator" },
  { pattern: /güvenlik|guvenlik|security/i, name: "securitySystem" },
];

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function absoluteUrl(origin: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatCoord(value: number): string {
  return value.toFixed(5);
}

function formatCheckTime(value: string | null | undefined, fallback: string): string {
  const raw = (value ?? fallback).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return `${fallback}:00+03:00`;
  const hours = String(match[1]).padStart(2, "0");
  const minutes = String(match[2]).padStart(2, "0");
  return `${hours}:${minutes}:00+03:00`;
}

function resolveVacationRentalType(villa: VillaDetail): string {
  const facility = villa.facilityCategories.join(" ").toLocaleLowerCase("tr-TR");
  if (facility.includes("bungalov") || facility.includes("bungalow")) {
    return "Bungalow";
  }
  if (villa.category === "apart" || villa.category === "suit_daire") {
    return "Apartment";
  }
  return "Villa";
}

function mapAmenityFeatures(amenities: string[]) {
  const features: Array<{
    "@type": "LocationFeatureSpecification";
    name: string;
    value: boolean;
  }> = [];
  const seen = new Set<string>();

  for (const amenity of amenities) {
    const normalized = amenity.trim();
    if (!normalized) continue;
    for (const rule of GOOGLE_AMENITY_MAP) {
      if (!rule.pattern.test(normalized) || seen.has(rule.name)) continue;
      seen.add(rule.name);
      features.push({
        "@type": "LocationFeatureSpecification",
        name: rule.name,
        value: true,
      });
      break;
    }
  }

  if (features.length === 0) {
    features.push({
      "@type": "LocationFeatureSpecification",
      name: "wifi",
      value: true,
    });
  }

  return features.slice(0, 30);
}

function buildBedDetails(villa: VillaDetail) {
  const beds: Array<{
    "@type": "BedDetails";
    numberOfBeds: number;
    typeOfBed: string;
  }> = [];

  for (const room of villa.rooms) {
    if (room.singleBeds > 0) {
      beds.push({
        "@type": "BedDetails",
        numberOfBeds: room.singleBeds,
        typeOfBed: "Single",
      });
    }
    if (room.doubleBeds > 0) {
      beds.push({
        "@type": "BedDetails",
        numberOfBeds: room.doubleBeds,
        typeOfBed: "Double",
      });
    }
  }

  if (beds.length === 0 && villa.bedrooms > 0) {
    beds.push({
      "@type": "BedDetails",
      numberOfBeds: Math.max(1, villa.bedrooms),
      typeOfBed: "Double",
    });
  }

  return beds;
}

function buildImageList(origin: string, villa: VillaDetail): string[] {
  const base = (villa.images?.length ? villa.images : [villa.image])
    .filter(Boolean)
    .map((image) => absoluteUrl(origin, image));

  if (base.length === 0) return [];
  if (base.length >= 8) return base.slice(0, 20);

  const padded: string[] = [];
  while (padded.length < 8) {
    for (const image of base) {
      padded.push(image);
      if (padded.length >= 8) break;
    }
  }
  return padded;
}

function buildContainsPlace(villa: VillaDetail) {
  const maxGuests = villa.guests + (villa.extraCapacity || 0);
  const totalRooms =
    villa.bedrooms + villa.livingRooms + (villa.bathrooms > 0 ? villa.bathrooms : 0);

  const accommodation: Record<string, unknown> = {
    "@type": "Accommodation",
    additionalType: "EntirePlace",
    occupancy: {
      "@type": "QuantitativeValue",
      value: Math.max(1, maxGuests),
    },
    numberOfBedrooms: villa.bedrooms || undefined,
    numberOfBathroomsTotal: villa.bathrooms || undefined,
    numberOfRooms: totalRooms > 0 ? totalRooms : undefined,
    amenityFeature: mapAmenityFeatures(villa.amenities),
    bed: buildBedDetails(villa),
  };

  return accommodation;
}

/** Villa detay için Google VacationRental JSON-LD. */
export function buildVillaLodgingJsonLd({
  villa,
  brandName,
  origin,
}: VillaJsonLdInput): Record<string, unknown> | null {
  if (!villa.hasCoords || !villa.latitude || !villa.longitude) {
    return null;
  }

  const description =
    stripHtml(villa.seoDescription || villa.description).slice(0, 5000) ||
    villa.name;
  const images = buildImageList(origin, villa);
  if (images.length === 0) return null;

  const url = absoluteUrl(origin, `/${villa.slug}`);
  const regionParts = villa.regionLabel.split(" - ").map((part) => part.trim());
  const addressLocality = regionParts[regionParts.length - 1] || villa.location;
  const addressRegion = regionParts.length > 1 ? regionParts[0] : undefined;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    additionalType: resolveVacationRentalType(villa),
    identifier: villa.villaCode || villa.id,
    name: villa.name,
    description,
    url,
    image: images,
    latitude: formatCoord(villa.latitude),
    longitude: formatCoord(villa.longitude),
    address: {
      "@type": "PostalAddress",
      addressCountry: "TR",
      addressLocality,
      addressRegion,
      streetAddress: villa.location || addressLocality,
    },
    containsPlace: buildContainsPlace(villa),
    checkinTime: formatCheckTime(villa.checkInTime, "16:00"),
    checkoutTime: formatCheckTime(villa.checkOutTime, "10:00"),
    knowsLanguage: ["tr-TR"],
    brand: brandName
      ? {
          "@type": "Brand",
          name: brandName,
        }
      : undefined,
  };

  if (villa.averageRating != null && villa.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: villa.averageRating,
      reviewCount: villa.reviewCount,
      ratingCount: villa.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (villa.reviews.length > 0) {
    schema.review = villa.reviews.slice(0, 5).map((review) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
      },
      author: {
        "@type": "Person",
        name: review.guestName,
      },
      datePublished: review.createdAt.slice(0, 10),
      reviewBody: review.comment.slice(0, 1000),
    }));
  }

  return JSON.parse(
    JSON.stringify(schema, (_key, value) =>
      value === undefined || value === null || value === "" ? undefined : value
    )
  ) as Record<string, unknown>;
}
