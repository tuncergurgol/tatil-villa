import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import BlogArchiveList from "@/components/blog/BlogArchiveList";
import ListingBreadcrumbs from "@/components/seo/ListingBreadcrumbs";
import { localizeBlogCard } from "@/lib/i18n/blog-en-translations";
import { localizeBlogCategory } from "@/lib/i18n/localize-public-label";
import { buildPublicAlternates } from "@/lib/i18n/hreflang";
import { blogArchiveSeo } from "@/lib/i18n/international-seo";
import { Link } from "@/lib/i18n/navigation";
import {
  countPublishedBlogPosts,
  getBlogCategoriesForPublic,
  getPublishedBlogPosts,
} from "@/lib/queries/cms-content";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getPublicSiteProfile } from "@/lib/public-site-profile";
import {
  buildBreadcrumbListJsonLd,
  buildCollectionPageJsonLd,
} from "@/lib/seo-json-ld";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 18;
const ARCHIVE_PATH = "/blog/yazilar";

type SearchParams = Promise<{
  kategori?: string;
  sayfa?: string;
}>;

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw || "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 500);
}

function archiveHref(input: { kategori?: string | null; sayfa?: number }) {
  const params = new URLSearchParams();
  if (input.kategori) params.set("kategori", input.kategori);
  if (input.sayfa && input.sayfa > 1) params.set("sayfa", String(input.sayfa));
  const q = params.toString();
  return q ? `${ARCHIVE_PATH}?${q}` : ARCHIVE_PATH;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [locale, query] = await Promise.all([getLocale(), searchParams]);
  const seo = blogArchiveSeo(locale);
  const categorySlug = query.kategori?.trim() || "";
  const page = parsePage(query.sayfa);

  let title = seo.title;
  let description = seo.description;
  if (categorySlug) {
    const categories = await getBlogCategoriesForPublic();
    const hit = categories.find((c) => c.slug === categorySlug);
    if (hit) {
      const name = localizeBlogCategory(hit.slug, hit.name, locale);
      title = `${name} — ${seo.title}`;
      description = `${name} kategorisindeki blog yazıları. ${seo.description}`;
    }
  }
  if (page > 1) {
    title = `${title} | ${page}`;
  }

  return {
    title,
    description,
    alternates: buildPublicAlternates(
      locale,
      archiveHref({ kategori: categorySlug || null, sayfa: page })
    ),
  };
}

export default async function BlogArchivePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [locale, query, company] = await Promise.all([
    getLocale(),
    searchParams,
    getCompanySettings(),
  ]);
  const site = await getPublicSiteProfile(company);
  const seo = blogArchiveSeo(locale);
  const categorySlug = query.kategori?.trim() || "";
  const page = parsePage(query.sayfa);

  const [categoriesRaw, totalCount] = await Promise.all([
    getBlogCategoriesForPublic(),
    countPublishedBlogPosts({
      categorySlug: categorySlug || undefined,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const posts = await getPublishedBlogPosts({
    categorySlug: categorySlug || undefined,
    limit: PAGE_SIZE,
    skip: (safePage - 1) * PAGE_SIZE,
  });

  const categories = categoriesRaw
    .filter((category) => category._count.posts > 0)
    .map((category) => ({
      id: category.id,
      name: localizeBlogCategory(category.slug, category.name, locale),
      slug: category.slug,
      count: category._count.posts,
    }));

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const h1 = activeCategory
    ? `${activeCategory.name} yazıları`
    : seo.title;

  const cards = posts.map((post) => {
    const card = localizeBlogCard(post.slug, post.title, post.excerpt, locale);
    const publishedLabel = post.publishedAt
      ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(post.publishedAt)
      : null;
    return {
      id: post.id,
      slug: post.slug,
      title: card.title,
      excerpt: card.excerpt || "",
      coverImage: post.coverImage,
      categoryName: post.category
        ? localizeBlogCategory(
            post.category.slug,
            post.category.name,
            locale
          )
        : null,
      publishedLabel,
    };
  });

  const origin = `https://${site.domain}`;
  const path = archiveHref({
    kategori: categorySlug || null,
    sayfa: safePage,
  });
  const breadcrumbLd = buildBreadcrumbListJsonLd(origin, [
    { name: "Ana Sayfa", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: h1, path },
  ]);
  const collectionLd = buildCollectionPageJsonLd({
    name: h1,
    description: seo.description,
    path,
    origin,
    items: cards.map((post) => ({
      name: post.title,
      path: `/blog/${post.slug}`,
    })),
  });

  const emptyLabel =
    locale === "tr"
      ? "Bu kategoride henüz yazı yok."
      : "No posts in this category yet.";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f3faff_0%,#fff8fb_45%,#ffffff_100%)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(125,211,252,0.26),_transparent_70%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <ListingBreadcrumbs
          items={[
            { label: "Ana sayfa", href: "/" },
            { label: "Blog", href: "/blog" },
            { label: h1 },
          ]}
        />

        <header className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            Blog
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {h1}
          </h1>
          <p className="mt-3 text-base text-slate-600">{seo.description}</p>
          <p className="mt-2 text-sm text-sky-700">
            {totalCount} yazı
            {activeCategory ? ` · ${activeCategory.name}` : ""}
            {totalPages > 1 ? ` · sayfa ${safePage}/${totalPages}` : ""}
          </p>
        </header>

        <nav
          aria-label="Blog kategorileri"
          className="mt-8 flex flex-wrap gap-2"
        >
          <Link
            href={ARCHIVE_PATH}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              !categorySlug
                ? "bg-sky-700 text-white"
                : "border border-sky-100 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
            }`}
          >
            {locale === "tr" ? "Tümü" : "All"}
          </Link>
          {categories.map((category) => {
            const active = category.slug === categorySlug;
            return (
              <Link
                key={category.id}
                href={archiveHref({ kategori: category.slug })}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-sky-700 text-white"
                    : "border border-sky-100 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                }`}
              >
                {category.name}
                <span className={`ml-1.5 text-xs ${active ? "text-sky-100" : "text-slate-400"}`}>
                  {category.count}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">
          <BlogArchiveList posts={cards} emptyLabel={emptyLabel} />
        </div>

        {totalPages > 1 ? (
          <nav
            aria-label="Sayfalama"
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
          >
            {safePage > 1 ? (
              <Link
                href={archiveHref({
                  kategori: categorySlug || null,
                  sayfa: safePage - 1,
                })}
                className="rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
              >
                ← {locale === "tr" ? "Önceki" : "Previous"}
              </Link>
            ) : null}
            <span className="px-3 text-sm tabular-nums text-slate-600">
              {safePage} / {totalPages}
            </span>
            {safePage < totalPages ? (
              <Link
                href={archiveHref({
                  kategori: categorySlug || null,
                  sayfa: safePage + 1,
                })}
                className="rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
              >
                {locale === "tr" ? "Sonraki" : "Next"} →
              </Link>
            ) : null}
          </nav>
        ) : null}

        <p className="mt-10 text-center text-sm text-slate-500">
          <Link href="/blog" className="font-medium text-sky-700 hover:underline">
            {locale === "tr" ? "İlham slider’ına dön" : "Back to blog highlights"}
          </Link>
        </p>
      </div>
    </main>
  );
}
