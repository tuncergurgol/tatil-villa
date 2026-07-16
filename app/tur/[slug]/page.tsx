import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublishedTourBySlug,
  tourExcludes,
  tourHighlights,
  tourIncludes,
} from "@/lib/queries/tours";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getPublishedTourBySlug(slug);
  if (!tour) return { title: "Tur bulunamadı" };
  return {
    title: tour.seoTitle || `${tour.title} | Tatildeyiz`,
    description:
      tour.seoDescription ||
      tour.shortDesc ||
      `${tour.title} — Tatildeyiz turları`,
    keywords: tour.seoKeywords || undefined,
    alternates: {
      canonical: tour.canonicalPath || `/tur/${tour.slug}`,
    },
  };
}

export default async function TourDetailPage({ params }: Props) {
  const { slug } = await params;
  const tour = await getPublishedTourBySlug(slug);
  if (!tour) notFound();

  const includes = tourIncludes(tour);
  const highlights = tourHighlights(tour);
  const excludes = tourExcludes(tour);
  const cover =
    tour.coverImage ||
    tour.images?.[0]?.url ||
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80";

  return (
    <main className="bg-[linear-gradient(180deg,#f4fbff_0%,#ffffff_40%)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-sky-600">
          <Link href="/tur/liste" className="hover:underline">
            Turlar
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-500">{tour.title}</span>
        </p>

        <div className="mt-5 overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-[0_12px_40px_rgba(14,165,233,0.1)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={tour.title}
            className="aspect-[21/9] w-full object-cover"
          />
          <div className="p-6 sm:p-8">
            {tour.tag ? (
              <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold capitalize text-rose-500">
                {tour.tag}
              </span>
            ) : null}
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {tour.title}
            </h1>
            <p className="mt-3 text-slate-600">
              {tour.shortDesc || tour.overview}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
              {tour.location ? <span>{tour.location}</span> : null}
              {tour.durationHours ? <span>· {tour.durationHours}</span> : null}
              {tour.priceFrom != null ? (
                <span className="font-semibold text-sky-700">
                  · {tour.priceFrom.toLocaleString("tr-TR")} {tour.currency}
                  &apos;den
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {tour.descriptionHtml ? (
          <section className="prose prose-slate mt-8 max-w-none rounded-[1.75rem] border border-sky-50 bg-white p-6 sm:p-8">
            <div dangerouslySetInnerHTML={{ __html: tour.descriptionHtml }} />
          </section>
        ) : null}

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            { title: "Öne çıkanlar", items: highlights },
            { title: "Dahil", items: includes },
            { title: "Hariç", items: excludes },
          ].map((block) =>
            block.items.length ? (
              <div
                key={block.title}
                className="rounded-[1.5rem] border border-sky-100 bg-white p-5"
              >
                <h2 className="font-semibold text-slate-900">{block.title}</h2>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {block.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </div>
      </div>
    </main>
  );
}
