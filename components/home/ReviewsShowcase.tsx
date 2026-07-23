"use client";

import Link from "next/link";

export type HomeReviewItem = {
  id: string;
  guestName: string;
  rating: number;
  comment: string;
  stayMonth: string;
  createdAt: string;
  villa: { name: string; slug: string } | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400" aria-label={`${rating} / 5 puan`}>
      {"★".repeat(Math.max(0, Math.min(5, rating)))}
      <span className="text-gray-300">
        {"★".repeat(Math.max(0, 5 - Math.min(5, rating)))}
      </span>
    </span>
  );
}

function ReviewCard({
  review,
  brandName,
  className = "",
}: {
  review: HomeReviewItem;
  brandName: string;
  className?: string;
}) {
  return (
    <article
      className={`flex h-full flex-col rounded-2xl border border-sky-100/80 bg-white p-4 shadow-sm sm:p-5 ${className}`}
      itemScope
      itemType="https://schema.org/Review"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div itemProp="author" itemScope itemType="https://schema.org/Person">
            <p className="font-semibold text-gray-900" itemProp="name">
              {review.guestName}
            </p>
          </div>
          {review.villa ? (
            <Link
              href={`/${review.villa.slug}`}
              className="mt-0.5 block truncate text-sm text-sky-600 hover:text-sky-700"
              itemProp="itemReviewed"
              itemScope
              itemType="https://schema.org/LodgingBusiness"
            >
              <span itemProp="name">{review.villa.name}</span>
            </Link>
          ) : (
            <div
              itemProp="itemReviewed"
              itemScope
              itemType="https://schema.org/Organization"
              className="sr-only"
            >
              <span itemProp="name">{brandName}</span>
            </div>
          )}
        </div>
        <div itemProp="reviewRating" itemScope itemType="https://schema.org/Rating">
          <Stars rating={review.rating} />
          <meta itemProp="ratingValue" content={String(review.rating)} />
          <meta itemProp="bestRating" content="5" />
          <meta itemProp="worstRating" content="1" />
        </div>
      </div>
      <p
        className="mt-3 line-clamp-5 flex-1 text-sm leading-relaxed text-gray-600"
        itemProp="reviewBody"
      >
        “{review.comment}”
      </p>
      {review.stayMonth ? (
        <p className="mt-3 text-xs text-gray-400">{review.stayMonth}</p>
      ) : null}
    </article>
  );
}

export default function ReviewsShowcase({
  reviews,
  brandName,
}: {
  reviews: HomeReviewItem[];
  brandName: string;
}) {
  if (reviews.length === 0) {
    return <p className="text-center text-sm text-gray-500">Henüz yorum yok.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            brandName={brandName}
            className="w-[min(88vw,340px)] shrink-0 snap-start sm:w-auto"
          />
        ))}
      </div>

      <div className="text-center">
        <Link
          href="/yorumlar"
          className="inline-flex items-center rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
        >
          Tüm yorumları gör
        </Link>
      </div>
    </div>
  );
}
