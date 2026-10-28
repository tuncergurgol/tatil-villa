import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { localizeBlogCard } from "@/lib/i18n/blog-en-translations";
import { localizeBlogCategory } from "@/lib/i18n/localize-public-label";
import { getPublishedBlogPost } from "@/lib/queries/cms-content";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";
import {
  demoteCmsHeadingToH2,
  sanitizePublicSeoDescription,
  sanitizePublicSeoTitle,
  upgradeInsecureSiteLinks,
} from "@/lib/public-seo";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [locale, post, company] = await Promise.all([
    getLocale(),
    getPublishedBlogPost(slug),
    getCompanySettings(),
  ]);
  if (!post) {
    return {
      title: locale === "tr" ? "Blog Yazısı Bulunamadı" : "Blog Post Not Found",
    };
  }
  const site = await getPublicSiteProfile(company);
  const card = localizeBlogCard(post.slug, post.title, post.excerpt, locale);
  const title = sanitizePublicSeoTitle(
    locale === "tr" ? post.seoTitle || post.title : card.title,
    site.brandName,
    card.title
  );

  return {
    title,
    description: sanitizePublicSeoDescription(
      locale === "tr"
        ? post.seoDescription || post.excerpt
        : card.excerpt || post.seoDescription || post.excerpt,
      card.title,
      site.brandName
    ),
    alternates: buildPublicAlternates(locale, `/blog/${post.slug}`),
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [locale, post, company] = await Promise.all([
    getLocale(),
    getPublishedBlogPost(slug),
    getCompanySettings(),
  ]);
  if (!post) notFound();
  const site = await getPublicSiteProfile(company);
  const card = localizeBlogCard(post.slug, post.title, post.excerpt, locale);
  const categoryName = post.category
    ? localizeBlogCategory(post.category.slug, post.category.name, locale)
    : null;
  const contentHtml = demoteCmsHeadingToH2(
    upgradeInsecureSiteLinks(post.content)
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: card.title,
    description: card.excerpt,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: post.coverImage || undefined,
    author: {
      "@type": "Organization",
      name: site.brandName,
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
      {categoryName ? (
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-teal-600">
          {categoryName}
        </p>
      ) : null}
      <h1 className="mt-2 text-3xl font-bold text-gray-900">{card.title}</h1>
      {card.excerpt ? (
        <p className="mt-4 text-lg text-gray-600">{card.excerpt}</p>
      ) : null}
      {post.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage}
          alt={card.title}
          className="mt-8 w-full rounded-2xl object-cover"
        />
      ) : null}
      <article
        className="prose prose-teal mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </main>
  );
}
