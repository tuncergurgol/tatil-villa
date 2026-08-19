import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, Clock3 } from "lucide-react";
import { getPublishedTours, type TourItem } from "@/lib/queries/tours";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Günübirlik Tur ve Aktiviteler | Tatildeyiz",
  description:
    "Fethiye ve çevresinde günübirlik turlar, tekne turları, safari ve aktiviteler. Tatildeyiz ile unutulmaz deneyimler.",
  alternates: {
    canonical: "/tur/liste",
  },
};

function coverOf(tour: TourItem) {
  return (
    tour.coverImage ||
    tour.images?.[0]?.url ||
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"
  );
}

function priceLabel(tour: TourItem) {
  if (tour.priceFrom == null) return null;
  return `${tour.priceFrom.toLocaleString("tr-TR")} ${tour.currency}`;
}

export default async function TourListPage() {
  const tours = await getPublishedTours();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f4fbff_0%,#fff8fb_45%,#ffffff_100%)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(125,211,252,0.35),_transparent_70%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
            Tatildeyiz Turları
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Günü Birlik Tur ve Aktiviteler
          </h1>
          <p className="mt-3 text-base text-slate-600 sm:text-lg">
            {tours.length} tur seçeneği · yumuşak mavi-pembe tonlarda keşif
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tours.map((tour) => {
            const price = priceLabel(tour);
            return (
              <article
                key={tour.id}
                className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-sky-100/80 bg-white/90 shadow-[0_10px_30px_rgba(14,165,233,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(14,165,233,0.14)]"
              >
                <Link href={`/tur/${tour.slug}`} className="relative block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverOf(tour)}
                    alt={tour.title}
                    className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  {tour.tag ? (
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold capitalize text-rose-500 shadow-sm">
                      {tour.tag}
                    </span>
                  ) : null}
                </Link>

                <div className="flex flex-1 flex-col p-4">
                  <h2 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">
                    <Link href={`/tur/${tour.slug}`} className="hover:text-sky-700">
                      {tour.title}
                    </Link>
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                    {tour.shortDesc || tour.overview}
                  </p>

                  <div className="mt-auto space-y-2 pt-4">
                    {tour.location ? (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-sky-500" />
                        <span className="line-clamp-1">{tour.location}</span>
                      </p>
                    ) : null}
                    {tour.durationHours ? (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock3 className="h-3.5 w-3.5 text-sky-500" />
                        {tour.durationHours}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-bold text-sky-700">
                        {price ? `${price}'den` : "Fiyat sorun"}
                      </span>
                      <Link
                        href={`/tur/${tour.slug}`}
                        className="rounded-full bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-800"
                      >
                        İncele
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {tours.length === 0 ? (
          <p className="mt-10 rounded-3xl border border-dashed border-sky-200 bg-white/70 p-10 text-center text-slate-500">
            Henüz yayınlanmış tur yok.
          </p>
        ) : null}
      </div>
    </main>
  );
}
