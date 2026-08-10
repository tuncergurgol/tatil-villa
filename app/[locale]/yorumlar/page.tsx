import type { Metadata } from "next";
import { headers } from "next/headers";
import { getApprovedReviewsForPublic } from "@/lib/queries/cms-content";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { buildReviewItemListJsonLd } from "@/lib/review-json-ld";
import { siteConfig } from "@/lib/data";

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
  const [reviews, company] = await Promise.all([
    getApprovedReviewsForPublic(100),
    getCompanySettings(),
  ]);
  const site = await getPublicSiteProfile(company);
  const brandName = site.brandName?.trim() || siteConfig.name;

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : undefined;

  const jsonLd = buildReviewItemListJsonLd({
    reviews,
    brandName,
    origin,
  });

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
            itemScope
            itemType="https://schema.org/Review"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div
                  itemProp="author"
                  itemScope
                  itemType="https://schema.org/Person"
                >
                  <p className="font-semibold text-gray-900" itemProp="name">
                    {review.guestName}
                  </p>
                </div>
                {review.villa ? (
                  <p
                    className="text-sm text-gray-500"
                    itemProp="itemReviewed"
                    itemScope
                    itemType="https://schema.org/LodgingBusiness"
                  >
                    <span itemProp="name">{review.villa.name}</span>
                  </p>
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
              <div
                itemProp="reviewRating"
                itemScope
                itemType="https://schema.org/Rating"
              >
                <Stars rating={review.rating} />
                <meta itemProp="ratingValue" content={String(review.rating)} />
                <meta itemProp="bestRating" content="5" />
                <meta itemProp="worstRating" content="1" />
              </div>
            </div>
            <p className="mt-4 text-gray-700" itemProp="reviewBody">
              {review.comment}
            </p>
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
