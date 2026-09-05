import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CampaignLandingHero from "@/components/campaigns/CampaignLandingHero";
import VillaCard from "@/components/VillaCard";
import type { Villa } from "@/lib/types";
import { EARLY_BOOKING_PRICE_YEAR } from "@/lib/home-campaigns";

export default function EarlyBookingCampaignPageView({
  villas,
  totalCount,
  page,
  totalPages,
}: {
  villas: Villa[];
  totalCount: number;
  page: number;
  totalPages: number;
}) {
  const year = EARLY_BOOKING_PRICE_YEAR;

  return (
    <main className="bg-slate-50">
      <CampaignLandingHero
        image="/campaigns/kampanya-2027-erken-rezervasyon.jpg"
        imageAlt={`${year} erken rezervasyon fırsatları`}
        eyebrow="Erken rezervasyon"
        title={`${year} yılı erken rezervasyon fırsatları`}
        subtitle={`${year} sezonu fiyatı girilmiş villaları şimdiden inceleyin. İstediğiniz tarihi dolmadan ayırtın.`}
        actions={
          <Link
            href={`/villalar?year=${year}`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-teal-800 transition hover:bg-teal-50"
          >
            Tüm listeyi aç
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {year} fiyatı olan villalar
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {totalCount > 0
              ? `${totalCount} villada ${year} yılı fiyat bilgisi bulunuyor.`
              : `${year} yılı için henüz fiyat girilmiş villa yok.`}
          </p>
        </div>

        {villas.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {villas.map((villa) => (
              <VillaCard key={villa.id} villa={villa} layout="fluid" />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            {year} sezonu fiyatları eklendikçe villalar burada listelenir.
          </p>
        )}

        {totalPages > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-3 text-sm">
            {page > 1 ? (
              <Link
                href={
                  page === 2
                    ? "/kampanyalar/2027-erken-rezervasyon"
                    : `/kampanyalar/2027-erken-rezervasyon?page=${page - 1}`
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-teal-300"
              >
                Önceki
              </Link>
            ) : null}
            <span className="text-slate-500">
              Sayfa {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/kampanyalar/2027-erken-rezervasyon?page=${page + 1}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-teal-300"
              >
                Sonraki
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
