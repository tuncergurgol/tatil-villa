import GalleryImage from "@/components/GalleryImage";
import Link from "next/link";
import {
  Bath,
  BedDouble,
  CheckCircle2,
  MapPin,
  Users,
} from "lucide-react";
import MemberFavoriteButton from "@/components/member/MemberFavoriteButton";
import type { Villa } from "@/lib/types";
import { categoryLabel, formatPrice } from "@/lib/utils";
import { villaPublicPath } from "@/lib/villa-public-path";

interface VillaResultCardProps {
  villa: Villa;
  nights?: number;
}

export default function VillaResultCard({
  villa,
  nights = 0,
}: VillaResultCardProps) {
  const reservationTotal =
    nights > 0 && villa.stayTotal != null && villa.stayTotal > 0
      ? villa.stayTotal
      : villa.pricePerNight && nights > 0
        ? villa.pricePerNight * nights
        : null;

  const nightlyAverage =
    villa.pricePerNight ??
    (reservationTotal != null && nights > 0
      ? Math.round(reservationTotal / nights)
      : null);

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-[16/11] w-full shrink-0 overflow-hidden sm:aspect-auto sm:min-h-[220px] sm:w-[280px] lg:w-[320px]">
          <Link href={villaPublicPath(villa.slug)} className="absolute inset-0">
            <GalleryImage
              src={villa.image}
              alt={villa.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 320px"
            />
          </Link>
          <div className="absolute right-3 top-3 z-10">
            <MemberFavoriteButton villaId={villa.id} />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                {categoryLabel(villa.category)}
              </span>
              {villa.deal ? (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  Fırsat
                </span>
              ) : null}
            </div>

            <Link href={villaPublicPath(villa.slug)}>
              <h3 className="text-base font-bold leading-snug text-gray-900 transition hover:text-sky-700 sm:text-lg">
                {villa.name}
              </h3>
            </Link>

            <p className="mt-1.5 flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              {villa.regionLabel || villa.location || villa.regionName || villa.region}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-sky-500" />
                {villa.guests} Kişilik
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BedDouble className="h-4 w-4 text-sky-500" />
                {villa.bedrooms} Oda
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Bath className="h-4 w-4 text-sky-500" />
                {villa.bathrooms} Banyo
              </span>
            </div>

            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Ön Onaylı Rezervasyon
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start justify-between border-t border-gray-100 pt-3 sm:w-[160px] sm:items-end sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            {nights > 0 ? (
              <p className="text-sm text-gray-500">{nights} Gece</p>
            ) : (
              <p className="text-sm text-gray-400">Gecelik</p>
            )}

            <div className="mt-2 text-left sm:mt-auto sm:text-right">
              {reservationTotal !== null ? (
                <>
                  {nights > 0 ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Rezervasyon Toplamı
                    </p>
                  ) : null}
                  <p className="text-xl font-bold text-gray-900">
                    {formatPrice(reservationTotal)}
                  </p>
                  {nightlyAverage != null ? (
                    <p className="mt-0.5 text-sm text-gray-500">
                      {formatPrice(nightlyAverage)} / Gece
                    </p>
                  ) : null}
                </>
              ) : villa.minNightlyPrice != null &&
                villa.maxNightlyPrice != null ? (
                <>
                  <p className="text-lg font-bold text-slate-800 sm:text-xl">
                    {villa.minNightlyPrice === villa.maxNightlyPrice
                      ? `${villa.minNightlyPrice.toLocaleString("tr-TR")}TL`
                      : `${villa.minNightlyPrice.toLocaleString("tr-TR")}TL - ${villa.maxNightlyPrice.toLocaleString("tr-TR")}TL`}
                    <span className="ml-1 text-xs font-semibold text-orange-500">
                      /Gecelik
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {villa.minNightlyPrice === villa.maxNightlyPrice
                      ? "Gecelik fiyat"
                      : "Fiyat Aralığında"}
                  </p>
                </>
              ) : villa.pricePerNight ? (
                <>
                  <p className="text-xl font-bold text-gray-900">
                    {formatPrice(villa.pricePerNight)}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">/ Gece</p>
                </>
              ) : (
                <p className="text-base font-semibold text-amber-600">
                  Teklif Alınız
                </p>
              )}
            </div>

            <Link
              href={villaPublicPath(villa.slug)}
              className="mt-3 inline-flex rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 sm:mt-4"
            >
              İncele
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
