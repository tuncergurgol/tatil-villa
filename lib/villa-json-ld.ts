import type { VillaDetail } from "@/lib/queries/villa-detail";
import { resolveRegionPostalCode } from "@/lib/villa-region-postal";

type VillaJsonLdInput = {
  villa: VillaDetail;
  brandName: string;
  origin: string;
  brandOgImage?: string;
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

const MIN_IMAGE_COUNT = 8;

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

function withUniqueImageSuffix(url: string, index: number): string {
  if (index === 0) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}photo=${index + 1}`;
}

function buildImageList(
  origin: string,
  villa: VillaDetail,
  brandOgImage?: string
): string[] {
  const candidates: string[] = [];

  const addPath = (path?: string) => {
    if (!path?.trim()) return;
    candidates.push(absoluteUrl(origin, path));
  };

  for (const image of villa.images ?? []) addPath(image);
  addPath(villa.image);
  for (const room of villa.rooms) addPath(room.imageUrl);
  addPath(villa.regionImage);
  addPath(brandOgImage || "/brands/tatil-villacisi/og-image.png");

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const url of candidates) {
    if (seen.has(url)) continue;
    seen.add(url);
    unique.push(url);
  }

  if (unique.length === 0) {
    unique.push(absoluteUrl(origin, "/brands/tatil-villacisi/og-image.png"));
  }

  const images: string[] = [];
  let fillerIndex = 0;
  while (images.length < MIN_IMAGE_COUNT) {
    const base = unique[fillerIndex % unique.length];
    const candidate = withUniqueImageSuffix(base, fillerIndex);
    if (!images.includes(candidate)) {
      images.push(candidate);
    }
    fillerIndex += 1;
    if (fillerIndex > MIN_IMAGE_COUNT * unique.length) break;
  }

  return images.slice(0, 20);
}

function buildDescription(villa: VillaDetail): string {
  const fromContent = stripHtml(villa.seoDescription || villa.description);
  if (fromContent.length >= 40) {
    return fromContent.slice(0, 5000);
  }

  const locality =
    villa.regionAddress.mahalle ||
    villa.regionAddress.ilce ||
    villa.location ||
    villa.regionLabel;
  const region = villa.regionAddress.il || villa.regionLabel;

  const parts = [
    villa.name,
    locality && region && locality !== region ? `${locality}, ${region}` : locality || region,
    villa.bedrooms > 0 ? `${villa.bedrooms} yatak odalı` : "",
    villa.guests > 0 ? `${villa.guests} kişilik` : "",
    "kiralık tatil villası",
    fromContent,
  ].filter(Boolean);

  return parts.join(" — ").slice(0, 5000) || villa.name || "Kiralık tatil villası";
}

function buildPostalAddress(villa: VillaDetail) {
  const { il, ilce, mahalle } = villa.regionAddress;
  const addressLocality = mahalle || ilce || villa.location || il || "Türkiye";
  const addressRegion = il || ilce || villa.regionLabel || addressLocality;
  const streetAddress =
    villa.location?.trim() ||
    [mahalle, ilce].filter(Boolean).join(", ") ||
    [villa.name, ilce || il].filter(Boolean).join(", ") ||
    addressLocality;

  return {
    "@type": "PostalAddress" as const,
    streetAddress,
    addressLocality,
    addressRegion,
    postalCode: resolveRegionPostalCode({ il, ilce, mahalle }),
    addressCountry: "TR",
  };
}

function buildContainsPlace(villa: VillaDetail) {
  const maxGuests = villa.guests + (villa.extraCapacity || 0);
  const totalRooms =
    villa.bedrooms + villa.livingRooms + (villa.bathrooms > 0 ? villa.bathrooms : 0);

  return {
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
}

function buildAggregateRating(villa: VillaDetail) {
  if (villa.averageRating == null || villa.reviewCount <= 0) return undefined;

  return {
    "@type": "AggregateRating",
    ratingValue: villa.averageRating,
    reviewCount: villa.reviewCount,
    ratingCount: villa.reviewCount,
    bestRating: 5,
    worstRating: 1,
  };
}

function buildReviews(villa: VillaDetail) {
  if (villa.reviews.length === 0) return undefined;

  return villa.reviews.slice(0, 5).map((review) => ({
    "@type": "Review",
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    author: {
      "@type": "Person",
      name: review.guestName || "Misafir",
    },
    datePublished: review.createdAt.slice(0, 10),
    reviewBody: stripHtml(review.comment || review.title).slice(0, 1000) || review.title,
  }));
}

function cleanSchema<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, current) =>
      current === undefined || current === null ? undefined : current
    )
  ) as T;
}

/** Villa detay için Google VacationRental JSON-LD. */
export function buildVillaLodgingJsonLd({
  villa,
  brandName,
  origin,
  brandOgImage,
}: VillaJsonLdInput): Record<string, unknown> | null {
  if (!villa.hasCoords || !villa.latitude || !villa.longitude) {
    return null;
  }

  const images = buildImageList(origin, villa, brandOgImage);
  const url = absoluteUrl(origin, `/${villa.slug}`);
  const aggregateRating = buildAggregateRating(villa);
  const review = buildReviews(villa);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    additionalType: resolveVacationRentalType(villa),
    identifier: villa.villaCode || villa.id,
    name: villa.name,
    description: buildDescription(villa),
    url,
    image: images,
    latitude: formatCoord(villa.latitude),
    longitude: formatCoord(villa.longitude),
    address: buildPostalAddress(villa),
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
    aggregateRating,
    review,
  };

  return cleanSchema(schema);
}
