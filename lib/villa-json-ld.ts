import type { VillaDetail } from "@/lib/queries/villa-detail";

type VillaJsonLdInput = {
  villa: VillaDetail;
  brandName: string;
  origin: string;
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function absoluteUrl(origin: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Villa detay için LodgingBusiness + VacationRental JSON-LD. */
export function buildVillaLodgingJsonLd({
  villa,
  brandName,
  origin,
}: VillaJsonLdInput): Record<string, unknown> {
  const description =
    stripHtml(villa.seoDescription || villa.description).slice(0, 5000) ||
    villa.name;
  const images = (villa.images?.length ? villa.images : [villa.image])
    .filter(Boolean)
    .slice(0, 10)
    .map((image) => absoluteUrl(origin, image));
  const url = absoluteUrl(origin, `/${villa.slug}`);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["LodgingBusiness", "VacationRental"],
    name: villa.name,
    description,
    url,
    image: images,
    telephone: undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: villa.regionLabel || villa.location,
      addressCountry: "TR",
    },
    geo:
      villa.hasCoords && villa.latitude && villa.longitude
        ? {
            "@type": "GeoCoordinates",
            latitude: villa.latitude,
            longitude: villa.longitude,
          }
        : undefined,
    numberOfRooms: villa.bedrooms || undefined,
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: villa.guests + (villa.extraCapacity || 0),
    },
    amenityFeature: villa.amenities.slice(0, 30).map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    priceRange: villa.pricePerNight
      ? `₺${villa.pricePerNight}+`
      : undefined,
  };

  if (villa.averageRating != null && villa.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: villa.averageRating,
      reviewCount: villa.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return JSON.parse(
    JSON.stringify(schema, (_key, value) =>
      value === undefined || value === null || value === "" ? undefined : value
    )
  ) as Record<string, unknown>;
}
