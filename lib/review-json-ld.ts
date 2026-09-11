export type ReviewJsonLdSource = {
  guestName: string;
  rating: number;
  comment: string;
  villa: { name: string; slug: string } | null;
};

type BuildReviewItemListOptions = {
  reviews: ReviewJsonLdSource[];
  brandName: string;
  origin?: string;
  listName?: string;
};

function absoluteUrl(origin: string | undefined, path: string): string | undefined {
  if (!origin) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Tek bir Review nesnesi — Google Review snippet kurallarına uygun. */
export function buildReviewJsonLdItem(
  review: ReviewJsonLdSource,
  brandName: string,
  origin?: string
): Record<string, unknown> {
  const authorName = review.guestName.trim() || "Misafir";
  const villaUrl = review.villa
    ? absoluteUrl(origin, `/${review.villa.slug}`)
    : undefined;

  return {
    "@type": "Review",
    author: {
      "@type": "Person",
      name: authorName,
    },
    reviewBody: review.comment,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    itemReviewed: review.villa
      ? {
          "@type": "LodgingBusiness",
          name: review.villa.name,
          ...(villaUrl ? { url: villaUrl } : {}),
        }
      : {
          "@type": "Organization",
          name: brandName,
          ...(origin ? { url: origin } : {}),
        },
  };
}

/** Yorum listesi için ItemList JSON-LD. */
export function buildReviewItemListJsonLd({
  reviews,
  brandName,
  origin,
  listName = "Misafir Yorumları",
}: BuildReviewItemListOptions): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    itemListElement: reviews.map((review, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: buildReviewJsonLdItem(review, brandName, origin),
    })),
  };
}
