import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedBlogPosts } from "@/lib/queries/cms-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog",
  description: "Villa kiralama rehberi, bölge önerileri ve tatil ipuçları.",
};

export default async function BlogIndexPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
      <p className="mt-3 text-gray-600">Villa kiralama ve tatil rehberi yazıları</p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article
            key={post.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            {post.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.coverImage}
                alt={post.title}
                className="h-44 w-full object-cover"
              />
            ) : (
              <div className="flex h-44 items-center justify-center bg-teal-50 text-sm text-teal-700">
                Tatildeyiz Blog
              </div>
            )}
            <div className="p-5">
              {post.category ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                  {post.category.name}
                </p>
              ) : null}
              <h2 className="mt-2 text-lg font-semibold text-gray-900">
                <Link href={`/blog/${post.slug}`} className="hover:text-teal-700">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 line-clamp-3 text-sm text-gray-600">{post.excerpt}</p>
            </div>
          </article>
        ))}
      </div>

      {posts.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          Henüz yayınlanmış blog yazısı yok.
        </p>
      ) : null}
    </main>
  );
}
