import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedBlogPost } from "@/lib/queries/cms-content";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) return { title: "Blog Yazısı Bulunamadı" };

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: post.coverImage || undefined,
    author: {
      "@type": "Organization",
      name: "Tatildeyiz",
    },
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href="/blog" className="text-sm font-medium text-teal-700 hover:underline">
        ← Blog
      </Link>
      {post.category ? (
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-teal-600">
          {post.category.name}
        </p>
      ) : null}
      <h1 className="mt-2 text-3xl font-bold text-gray-900">{post.title}</h1>
      {post.excerpt ? <p className="mt-4 text-lg text-gray-600">{post.excerpt}</p> : null}
      {post.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage}
          alt={post.title}
          className="mt-8 w-full rounded-2xl object-cover"
        />
      ) : null}
      <article
        className="prose prose-teal mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </main>
  );
}
