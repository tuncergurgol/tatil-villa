import type { Metadata } from "next";
import { getApprovedReviewsForPublic } from "@/lib/queries/cms-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Misafir Yorumları",
  description: "Villalarımızda konaklayan misafirlerimizin değerlendirmeleri.",
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} / 5 puan`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? "text-amber-400" : "text-gray-300"}>
          ★
        </span>
      ))}
    </div>
  );
}

export default async function ReviewsPage() {
  const reviews = await getApprovedReviewsForPublic(100);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: reviews.map((review, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
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
        reviewBody: review.comment,
        itemReviewed: review.villa
          ? {
              "@type": "LodgingBusiness",
              name: review.villa.name,
            }
          : {
              "@type": "Organization",
              name: "Tatildeyiz",
            },
      },
    })),
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl font-bold text-gray-900">Misafir Yorumları</h1>
      <p className="mt-3 text-gray-600">
        Konaklamış misafirlerimizin deneyimleri ve puanları
      </p>

      <div className="mt-10 space-y-4">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{review.guestName}</p>
                {review.villa ? (
                  <p className="text-sm text-gray-500">{review.villa.name}</p>
                ) : null}
              </div>
              <Stars rating={review.rating} />
            </div>
            <p className="mt-4 text-gray-700">{review.comment}</p>
            {review.stayMonth ? (
              <p className="mt-3 text-xs text-gray-400">{review.stayMonth}</p>
            ) : (
              <p className="mt-3 text-xs text-gray-400">
                {new Date(review.createdAt).toLocaleDateString("tr-TR")}
              </p>
            )}
          </article>
        ))}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          Henüz yayınlanmış yorum yok.
        </p>
      ) : null}
    </main>
  );
}
