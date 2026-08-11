"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import {
  OTELZ_BANNER_ALT,
  OTELZ_BANNER_IMAGE_URL,
  type OtelzAffiliateParams,
  type OtelzSalesPage,
} from "@/lib/otelz";
import OtelzDestinationSearch from "@/components/otel/OtelzDestinationSearch";
import {
  buildOtelzPlaceSearchUrl,
  type OtelzPlaceSuggestion,
} from "@/lib/otelz-places";

type OtelzLandingPageProps = {
  affiliate: OtelzAffiliateParams;
  activePage: OtelzSalesPage & { href: string };
  bannerUrl: string;
};

function openOtelz(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function OtelzLandingPage({
  affiliate,
  activePage,
  bannerUrl,
}: OtelzLandingPageProps) {
  const [destination, setDestination] = useState<OtelzPlaceSuggestion | null>(
    null
  );
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  const searchUrl = useMemo(
    () =>
      buildOtelzPlaceSearchUrl({
        place: destination,
        checkIn,
        checkOut,
        guests,
        affiliate,
      }),
    [affiliate, checkIn, checkOut, destination, guests]
  );

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    openOtelz(searchUrl);
  }

  return (
    <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <form
          onSubmit={handleSearch}
          className="rounded-3xl border border-sky-100 bg-white p-5 shadow-lg shadow-sky-100/60 sm:p-6"
        >
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
              Otelz ile ara
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              {activePage.label}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{activePage.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <MapPin className="size-4 text-sky-600" />
                Otel / Bölge
              </span>
              <OtelzDestinationSearch
                value={destination}
                onChange={setDestination}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <CalendarDays className="size-4 text-sky-600" />
                Giriş
              </span>
              <input
                type="date"
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <CalendarDays className="size-4 text-sky-600" />
                Çıkış
              </span>
              <input
                type="date"
                value={checkOut}
                onChange={(event) => setCheckOut(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Users className="size-4 text-sky-600" />
                Misafir sayısı
              </span>
              <input
                type="number"
                min={1}
                max={20}
                value={guests}
                onChange={(event) =>
                  setGuests(Math.max(1, Number(event.target.value) || 1))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ACFF] px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-sky-200 transition hover:bg-[#0096df]"
          >
            <Search className="size-4" />
            Otel Ara
          </button>
        </form>
      </div>

      <aside className="space-y-4">
        <a
          href={bannerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm transition hover:shadow-md"
        >
          <Image
            src={OTELZ_BANNER_IMAGE_URL}
            alt={OTELZ_BANNER_ALT}
            width={300}
            height={250}
            className="h-auto w-full"
            unoptimized
          />
        </a>

        <a
          href={activePage.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl bg-[#00ACFF] px-4 py-3 text-center text-sm font-semibold text-white shadow-md shadow-sky-200 transition hover:bg-[#0096df]"
          style={{
            textDecoration: "none",
            padding: "12px 16px",
            fontSize: "14px",
            color: "#fff",
            backgroundColor: "#00ACFF",
            border: "none",
          }}
        >
          Rezervasyon Yap
        </a>

        <div className="rounded-2xl border border-sky-100 bg-white/90 p-4 text-xs leading-relaxed text-slate-500">
          Otel arama ve rezervasyon işlemleri{" "}
          <span className="font-semibold text-slate-700">Otelz.com</span> üzerinde
          güvenle tamamlanır. Tatildeyiz satış ortağı bağlantısı ile
          yönlendirilirsiniz.
        </div>
      </aside>
    </div>
  );
}
