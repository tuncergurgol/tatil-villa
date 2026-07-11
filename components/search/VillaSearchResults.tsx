"use client";

import { useRouter } from "next/navigation";
import VillaResultCard from "@/components/search/VillaResultCard";
import type { Villa } from "@/lib/types";

interface VillaSearchResultsProps {
  villas: Villa[];
  totalCount: number;
  titleLabel: string;
  nights: number;
  currentParams: Record<string, string | undefined>;
  sort: string;
}

function buildHref(
  current: Record<string, string | undefined>,
  patch: Record<string, string | null>
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/villalar?${qs}` : "/villalar";
}

export default function VillaSearchResults({
  villas,
  totalCount,
  titleLabel,
  nights,
  currentParams,
  sort,
}: VillaSearchResultsProps) {
  const router = useRouter();

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          {titleLabel} için toplam{" "}
          <span className="text-sky-600">{totalCount}</span> tesis bulduk!
        </h1>
        <p className="mt-1 text-sm text-sky-600">
          Fiyat ve İndirimler / En İyi Fiyat Garantisi
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-sky-900">
          Üye indirimlerinden yararlanmak için giriş yapabilirsiniz.
        </p>
        <a
          href="/admin/login"
          className="inline-flex shrink-0 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
        >
          Giriş Yap
        </a>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
            checked={Boolean(currentParams.checkIn && currentParams.checkOut)}
            readOnly
          />
          Sadece müsait tesisleri göster
          {currentParams.checkIn && currentParams.checkOut
            ? " (tarih seçili)"
            : " (tarih seçin)"}
        </label>

        <select
          value={sort}
          onChange={(e) =>
            router.push(buildHref(currentParams, { sort: e.target.value }))
          }
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-sky-400"
        >
          <option value="recommended">Önerilen Sıralama</option>
          <option value="random">Karışık</option>
          <option value="price_asc">Fiyat (Artan)</option>
          <option value="price_desc">Fiyat (Azalan)</option>
          <option value="guests">Kapasite</option>
        </select>
      </div>

      {villas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-lg font-medium text-gray-600">Sonuç bulunamadı</p>
          <p className="mt-1 text-sm text-gray-500">
            Filtreleri değiştirerek tekrar deneyin.
          </p>
          <a
            href="/villalar"
            className="mt-4 inline-block text-sm font-semibold text-sky-700 hover:text-sky-900"
          >
            Tüm villaları göster
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {villas.map((villa) => (
            <VillaResultCard key={villa.id} villa={villa} nights={nights} />
          ))}
        </div>
      )}
    </div>
  );
}
