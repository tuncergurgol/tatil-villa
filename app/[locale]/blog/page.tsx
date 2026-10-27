import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import BlogInspirationSlider from "@/components/blog/BlogInspirationSlider";
import { localizeBlogCard } from "@/lib/i18n/blog-en-translations";
import { localizeBlogCategory } from "@/lib/i18n/localize-public-label";
import {
  getBlogCategoriesForPublic,
  getPublishedBlogPosts,
} from "@/lib/queries/cms-content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title:
      locale === "tr"
        ? "Bir sonraki seyahatiniz için ilham alın | Blog"
        : "Inspiration for your next trip | Blog",
    description:
      locale === "tr"
        ? "Villa kiralama rehberi, bölge önerileri ve tatil ipuçları."
        : "Villa rental guides, destination tips and holiday ideas.",
    alternates: { canonical: "/blog" },
  };
}

export default async function BlogIndexPage() {
  const [locale, posts, blogCategoryRows] = await Promise.all([
    getLocale(),
    getPublishedBlogPosts(),
    getBlogCategoriesForPublic(),
  ]);

  const blogCategories = blogCategoryRows
    .filter((category) => category._count.posts > 0)
    .map((category) => ({
      id: category.id,
      name: localizeBlogCategory(category.slug, category.name, locale),
      slug: category.slug,
    }));

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f3faff_0%,#fff8fb_50%,#ffffff_100%)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(125,211,252,0.28),_transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <BlogInspirationSlider
          headingLevel={1}
          categories={blogCategories}
          posts={posts.map((post) => {
            const card = localizeBlogCard(
              post.slug,
              post.title,
              post.excerpt,
              locale
            );
            return {
              id: post.id,
              slug: post.slug,
              title: card.title,
              excerpt: card.excerpt,
              coverImage: post.coverImage,
              categoryName: post.category
                ? localizeBlogCategory(
                    post.category.slug,
                    post.category.name,
                    locale
                  )
                : null,
              categorySlug: post.category?.slug ?? null,
            };
          })}
        />
      </div>
    </main>
  );
}
