import type { Metadata } from "next";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { getApprovedReviewsForPublic } from "@/lib/queries/cms-content";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { localizeReviewContent } from "@/lib/i18n/review-en-translations";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";
import { reviewsMetaDescription } from "@/lib/i18n/international-seo";
import { maybeRewriteVillaWording } from "@/lib/public-listing-copy";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { buildReviewItemListJsonLd } from "@/lib/review-json-ld";
import { siteConfig } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [company, locale, t] = await Promise.all([
    getCompanySettings(),
    getLocale(),
    getTranslations("chrome"),
  ]);
  const site = await getPublicSiteProfile(company);
  return {
    title: t("guestReviews"),
    description: maybeRewriteVillaWording(
      reviewsMetaDescription(locale),
      site.key
    ),
    alternates: buildPublicAlternates(locale, "/yorumlar"),
  };
}

function Stars({ rating, locale }: { rating: number; locale: string }) {
  return (
    <div
      className="flex gap-0.5"
      aria-label={
        locale === "tr" ? `${rating} / 5 puan` : `${rating} / 5 stars`
      }
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? "text-amber-700" : "text-gray-500"}>
          ★
        </span>
      ))}
    </div>
  );
}

export default async function ReviewsPage() {
  const [locale, t, reviews, company] = await Promise.all([
    getLocale(),
    getTranslations("chrome"),
    getApprovedReviewsForPublic(100),
    getCompanySettings(),
  ]);
  const site = await getPublicSiteProfile(company);
  const brandName = site.brandName?.trim() || siteConfig.name;

  const localizedReviews = reviews.map((review) => {
    const localized = localizeReviewContent(review, locale);
    return {
      ...review,
      title: localized.title,
      comment: localized.comment,
    };
  });

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : undefined;

  const jsonLd = buildReviewItemListJsonLd({
    reviews: localizedReviews,
    brandName,
    origin,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-3xl font-bold text-gray-900">{t("guestReviews")}</h1>
      <p className="mt-3 text-gray-600">
        {locale === "tr"
          ? "Konaklamış misafirlerimizin deneyimleri ve puanları"
          : "Experiences and ratings from guests who stayed with us"}
      </p>

      <div className="mt-10 space-y-4">
        {localizedReviews.map((review) => (
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
                <Stars rating={review.rating} locale={locale} />
                <meta itemProp="ratingValue" content={String(review.rating)} />
                <meta itemProp="bestRating" content="5" />
                <meta itemProp="worstRating" content="1" />
              </div>
            </div>
            <p className="mt-4 text-gray-700" itemProp="reviewBody">
              {review.comment}
            </p>
            {review.stayMonth ? (
              <p className="mt-3 text-xs text-gray-600">{review.stayMonth}</p>
            ) : (
              <p className="mt-3 text-xs text-gray-600">
                {new Date(review.createdAt).toLocaleDateString(
                  locale === "tr" ? "tr-TR" : "en-GB"
                )}
              </p>
            )}
          </article>
        ))}
      </div>

      {localizedReviews.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          {locale === "tr"
            ? "Henüz yayınlanmış yorum yok."
            : "No published reviews yet."}
        </p>
      ) : null}
    </main>
  );
}
