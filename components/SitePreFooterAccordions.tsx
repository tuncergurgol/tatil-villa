import BlogInspirationSlider from "@/components/blog/BlogInspirationSlider";
import FaqCategoryPanel from "@/components/home/FaqCategoryPanel";
import HomeContentSection from "@/components/home/HomeContentSection";
import ReviewsShowcase from "@/components/home/ReviewsShowcase";
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
  category: { name: string; slug: string } | null;
};

type BlogCategoryItem = {
  id: string;
  name: string;
  slug: string;
};

export default function SitePreFooterAccordions({
  faqs,
  reviews,
  posts,
  blogCategories,
  brandName,
}: {
  faqs: FaqItem[];
  reviews: ReviewItem[];
  posts: BlogItem[];
  blogCategories: BlogCategoryItem[];
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

  return (
    <section
      className="cv-auto relative overflow-hidden border-t border-sky-50 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_55%)]"
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

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-10 sm:gap-6 sm:px-6 sm:py-14 lg:px-8">
        <HomeContentSection id="sik-sorulan-sorular" title="Sık Sorulan Sorular">
          <FaqCategoryPanel faqs={faqs} />
        </HomeContentSection>

        <HomeContentSection id="misafir-yorumlari" title="Misafir Yorumları">
          <ReviewsShowcase
            brandName={brandName}
            reviews={reviews.map((review) => ({
              id: review.id,
              guestName: review.guestName,
              rating: review.rating,
              comment: review.comment,
              stayMonth: review.stayMonth,
              createdAt: review.createdAt.toISOString(),
              villa: review.villa,
            }))}
          />
        </HomeContentSection>

        <HomeContentSection id="blog" title="Bloglar" variant="gradient">
          <BlogInspirationSlider
            embedded
            showHeader={false}
            categories={blogCategories}
            posts={posts.map((post) => ({
              id: post.id,
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt,
              coverImage: post.coverImage,
              categoryName: post.category?.name ?? null,
              categorySlug: post.category?.slug ?? null,
            }))}
          />
        </HomeContentSection>
      </div>
    </section>
  );
}
