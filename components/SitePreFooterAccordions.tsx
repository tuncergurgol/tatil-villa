import Link from "next/link";
import { BookOpen, ChevronDown, HelpCircle, MessageCircleHeart } from "lucide-react";
import BlogInspirationSlider from "@/components/blog/BlogInspirationSlider";
import { buildReviewItemListJsonLd } from "@/lib/review-json-ld";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

type ReviewItem = {
  id: string;
  guestName: string;
  rating: number;
  comment: string;
  stayMonth: string;
  createdAt: Date;
  villa: { name: string; slug: string } | null;
};

type BlogItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  publishedAt: Date | null;
  category: { name: string } | null;
};

const faqCategoryLabels: Record<string, string> = {
  genel: "Genel",
  rezervasyon: "Rezervasyon",
  odeme: "Ödeme",
  "villa-konaklama": "Villa & Konaklama",
  "iptal-iade": "İptal & İade",
  "bolge-tatil": "Bölge & Tatil",
  guvenlik: "Güvenlik",
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

function AccordionSection({
  id,
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <details
      id={id}
      className="group mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-sky-100/80 bg-white shadow-[0_8px_30px_rgba(14,165,233,0.06)] open:shadow-[0_12px_40px_rgba(14,165,233,0.1)] transition"
    >
      <summary className="flex cursor-pointer list-none flex-col items-center gap-3 px-6 py-8 text-center sm:px-10 [&::-webkit-details-marker]:hidden">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
          <Icon className="h-5 w-5" />
        </span>
        <span className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {title}
          </h2>
          <span className="h-1 w-10 rounded-full bg-sky-500" />
          <p className="max-w-md text-sm text-gray-500">{subtitle}</p>
        </span>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1 text-xs font-medium text-sky-700">
          Detayları gör
          <ChevronDown className="h-3.5 w-3.5 transition duration-300 group-open:rotate-180" />
        </span>
      </summary>
      <div className="border-t border-sky-50 bg-gradient-to-b from-sky-50/40 to-white px-5 pb-8 pt-6 sm:px-8">
        {children}
      </div>
    </details>
  );
}

export default function SitePreFooterAccordions({
  faqs,
  reviews,
  posts,
  brandName,
}: {
  faqs: FaqItem[];
  reviews: ReviewItem[];
  posts: BlogItem[];
  brandName: string;
}) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const reviewJsonLd = buildReviewItemListJsonLd({
    reviews,
    brandName,
  });

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Blog",
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `/blog/${post.slug}`,
      name: post.title,
    })),
  };

  const categories = Array.from(new Set(faqs.map((faq) => faq.category)));

  return (
    <section
      className="relative overflow-hidden border-t border-sky-50 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_55%)]"
      aria-label="Site içerik alanları"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12),_transparent_70%)]"
        aria-hidden
      />

      {faqs.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
      {reviews.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewJsonLd) }}
        />
      ) : null}
      {posts.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
        />
      ) : null}

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-12 sm:gap-6 sm:px-6 sm:py-16 lg:px-8">
        <AccordionSection
          id="sik-sorulan-sorular"
          title="Sık Sorulan Sorular"
          subtitle="Rezervasyon, ödeme ve konaklama hakkında merak edilenler"
          icon={HelpCircle}
        >
          {faqs.length === 0 ? (
            <p className="text-center text-sm text-gray-500">
              Henüz soru eklenmedi.
            </p>
          ) : (
            <div className="mx-auto max-w-2xl space-y-6">
              {categories.map((category) => {
                const items = faqs.filter((faq) => faq.category === category);
                if (items.length === 0) return null;
                return (
                  <div key={category}>
                    <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-sky-600">
                      {faqCategoryLabels[category] ?? category}
                    </h3>
                    <div className="space-y-2.5">
                      {items.map((faq) => (
                        <details
                          key={faq.id}
                          className="group/item rounded-2xl border border-sky-100/80 bg-white px-4 py-3.5 shadow-sm open:border-sky-200 open:shadow-md"
                        >
                          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-left font-medium text-gray-900 [&::-webkit-details-marker]:hidden">
                            <span>{faq.question}</span>
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-sky-400 transition group-open/item:rotate-180" />
                          </summary>
                          <p className="mt-3 border-t border-sky-50 pt-3 text-sm leading-relaxed text-gray-600">
                            {faq.answer}
                          </p>
                        </details>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 text-center">
                <Link
                  href="/sik-sorulan-sorular"
                  className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
                >
                  Tüm soruları gör
                </Link>
              </div>
            </div>
          )}
        </AccordionSection>

        <AccordionSection
          id="misafir-yorumlari"
          title="Misafir Yorumları"
          subtitle="Villalarımızda konaklayan misafirlerin deneyimleri"
          icon={MessageCircleHeart}
        >
          {reviews.length === 0 ? (
            <p className="text-center text-sm text-gray-500">Henüz yorum yok.</p>
          ) : (
            <div className="mx-auto max-w-2xl space-y-3">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-sky-100/80 bg-white p-5 text-center shadow-sm sm:text-left"
                  itemScope
                  itemType="https://schema.org/Review"
                >
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:justify-between">
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
                          className="text-sm text-sky-600/80"
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
                      <meta
                        itemProp="ratingValue"
                        content={String(review.rating)}
                      />
                      <meta itemProp="bestRating" content="5" />
                      <meta itemProp="worstRating" content="1" />
                    </div>
                  </div>
                  <p
                    className="mt-3 text-sm leading-relaxed text-gray-600"
                    itemProp="reviewBody"
                  >
                    “{review.comment}”
                  </p>
                </article>
              ))}
              <div className="pt-2 text-center">
                <Link
                  href="/yorumlar"
                  className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600"
                >
                  Tüm yorumları gör
                </Link>
              </div>
            </div>
          )}
        </AccordionSection>

        <AccordionSection
          id="blog"
          title="Blog"
          subtitle="Tatil rehberi, bölge önerileri ve villa ipuçları"
          icon={BookOpen}
        >
          <BlogInspirationSlider
            posts={posts.map((post) => ({
              id: post.id,
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt,
              coverImage: post.coverImage,
              categoryName: post.category?.name ?? null,
            }))}
          />
        </AccordionSection>
      </div>
    </section>
  );
}
