import type { Metadata } from "next";
import BlogInspirationSlider from "@/components/blog/BlogInspirationSlider";
import { getPublishedBlogPosts } from "@/lib/queries/cms-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bir sonraki seyahatiniz için ilham alın | Blog",
  description: "Villa kiralama rehberi, bölge önerileri ve tatil ipuçları.",
};

export default async function BlogIndexPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f3faff_0%,#fff8fb_50%,#ffffff_100%)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(125,211,252,0.28),_transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
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
      </div>
    </main>
  );
}
