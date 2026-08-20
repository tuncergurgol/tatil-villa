"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CategoryFilterPills from "@/components/ui/CategoryFilterPills";

export type BlogInspirationPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  categoryName?: string | null;
  categorySlug?: string | null;
};

export type BlogInspirationCategory = {
  id: string;
  name: string;
  slug: string;
};

function BlogCategoryFilters({
  categories,
  activeSlug,
  onChange,
}: {
  categories: BlogInspirationCategory[];
  activeSlug: string | null;
  onChange: (slug: string | null) => void;
}) {
  return (
    <CategoryFilterPills
      categories={categories.map((category) => ({
        id: category.slug,
        label: category.name,
      }))}
      activeId={activeSlug}
      onChange={onChange}
    />
  );
}

export default function BlogInspirationSlider({
  posts,
  categories = [],
  title = "Bir sonraki seyahatiniz için ilham alın",
  subtitle = "Tatil rehberi, bölge önerileri ve villa ipuçları",
  showHeader = true,
  embedded = false,
  ctaHref = "/blog",
  ctaLabel = "Tüm yazıları gör",
}: {
  posts: BlogInspirationPost[];
  categories?: BlogInspirationCategory[];
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  embedded?: boolean;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    const base = posts.filter((post) => post.title.trim().length > 0);
    if (!activeCategorySlug) return base;
    return base.filter((post) => post.categorySlug === activeCategorySlug);
  }, [posts, activeCategorySlug]);

  useEffect(() => {
    setIndex(0);
  }, [activeCategorySlug]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [items.length]);

  const outerClass = embedded
    ? ""
    : "overflow-hidden rounded-[2.25rem] border border-sky-100/80 bg-[linear-gradient(135deg,#eef9ff_0%,#fff7fb_48%,#ffffff_100%)] p-5 shadow-[0_16px_50px_rgba(56,189,248,0.12)] sm:p-8";

  if (posts.length === 0) {
    return (
      <div
        className={
          embedded
            ? "py-6 text-center text-sm text-gray-500"
            : "rounded-[2rem] border border-dashed border-sky-200 bg-white/70 p-10 text-center text-slate-500"
        }
      >
        Henüz yazı yok.
      </div>
    );
  }

  const active = items[index % items.length];
  const fan = active
    ? [
        items[(index + 1) % items.length],
        items[(index + 2) % items.length],
        items[(index + 3) % items.length],
      ].filter(Boolean)
    : [];

  return (
    <section className={outerClass}>
      {showHeader ? (
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">{subtitle}</p>
          <div className="mt-5">
            <BlogCategoryFilters
              categories={categories}
              activeSlug={activeCategorySlug}
              onChange={setActiveCategorySlug}
            />
          </div>
        </div>
      ) : (
        <BlogCategoryFilters
          categories={categories}
          activeSlug={activeCategorySlug}
          onChange={setActiveCategorySlug}
        />
      )}

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500">
          Bu kategoride henüz yazı yok.
        </p>
      ) : (
        <div className={`grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] ${showHeader ? "mt-8" : "mt-6"}`}>
          <div className="relative mx-auto h-56 w-full max-w-sm sm:h-64">
            {fan.map((post, i) => (
              <div
                key={`${post.id}-fan-${i}`}
                className="absolute left-1/2 top-4 h-44 w-36 overflow-hidden rounded-[1.5rem] border-4 border-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition duration-500 sm:h-52 sm:w-40"
                style={{
                  transform: `translateX(calc(-50% + ${(i - 1) * 42}px)) rotate(${
                    (i - 1) * 8
                  }deg)`,
                  zIndex: i === 1 ? 3 : 1,
                }}
              >
                {post.coverImage ? (
                  <Image
                    src={post.coverImage}
                    alt=""
                    fill
                    sizes="160px"
                    quality={60}
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-sky-50 text-sky-600">
                    Blog
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="relative">
            <Link
              href={`/blog/${active.slug}`}
              className="group block overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_18px_40px_rgba(14,165,233,0.12)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                {active.coverImage ? (
                  <Image
                    src={active.coverImage}
                    alt={active.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 560px"
                    quality={60}
                    className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-sky-50 text-sky-600">
                    Tatildeyiz Blog
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent p-5 pt-16">
                  {active.categoryName ? (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">
                      {active.categoryName}
                    </p>
                  ) : null}
                  <h3 className="mt-1 text-lg font-bold text-white sm:text-xl">
                    {active.title}
                  </h3>
                  {active.excerpt ? (
                    <p className="mt-1 line-clamp-2 text-sm text-white/85">
                      {active.excerpt}
                    </p>
                  ) : null}
                </div>
              </div>
            </Link>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Önceki"
                  onClick={() =>
                    setIndex((prev) => (prev - 1 + items.length) % items.length)
                  }
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-sky-100 bg-white text-sky-600 shadow-sm transition hover:bg-sky-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Sonraki"
                  onClick={() => setIndex((prev) => (prev + 1) % items.length)}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-sky-100 bg-white text-sky-600 shadow-sm transition hover:bg-sky-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <p
                className="min-w-[4.5rem] text-center text-sm font-medium tabular-nums text-slate-600"
                aria-live="polite"
              >
                {(index % items.length) + 1} / {items.length}
              </p>

              <Link
                href={ctaHref}
                className="hidden rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 sm:inline-flex"
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-center sm:hidden">
        <Link
          href={ctaHref}
          className="inline-flex rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
