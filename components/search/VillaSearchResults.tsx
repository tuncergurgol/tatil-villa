"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import VillaResultCard from "@/components/search/VillaResultCard";
import {
  buildVillaSearchHref,
} from "@/lib/villa-search-params";
import type { Villa } from "@/lib/types";

interface VillaSearchResultsProps {
  villas: Villa[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  titleLabel: string;
  nights: number;
  currentParams: Record<string, string | undefined>;
  sort: string;
}

export default function VillaSearchResults({
  villas,
  totalCount,
  page,
  pageSize,
  totalPages,
  titleLabel,
  nights,
  currentParams,
  sort,
}: VillaSearchResultsProps) {
  const router = useRouter();
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((pageNumber) => {
      if (totalPages <= 7) return true;
      if (pageNumber === 1 || pageNumber === totalPages) return true;
      return Math.abs(pageNumber - page) <= 1;
    })
    .reduce<number[]>((acc, pageNumber, index, list) => {
      if (index > 0 && pageNumber - list[index - 1] > 1) {
        acc.push(-1);
      }
      acc.push(pageNumber);
      return acc;
    }, []);

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          {titleLabel} için toplam{" "}
          <span className="text-sky-600">{totalCount}</span> tesis bulduk!
        </h1>
        <p className="mt-1 text-sm text-sky-600">
          Fiyat ve İndirimler / En İyi Fiyat Garantisi
          {totalCount > 0 ? (
            <span className="text-gray-500">
              {" "}
              ·{" "}
              {totalCount > pageSize && page === 1
                ? `İlk ${pageSize} sonuç gösteriliyor`
                : `${rangeStart}–${rangeEnd} arası gösteriliyor`}
              {totalPages > 1 ? ` (sayfa ${page}/${totalPages})` : ""}
            </span>
          ) : null}
        </p>
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
            router.push(
              buildVillaSearchHref(currentParams, {
                sort: e.target.value,
                page: null,
              })
            )
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
        <>
          <div className="space-y-4">
            {villas.map((villa) => (
              <VillaResultCard key={villa.id} villa={villa} nights={nights} />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav
              className="mt-8 flex flex-wrap items-center justify-center gap-2"
              aria-label="Sayfalama"
            >
              {page > 1 ? (
                <Link
                  href={buildVillaSearchHref(currentParams, {
                    page: String(page - 1),
                  })}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Önceki
                </Link>
              ) : null}

              {pageNumbers.map((pageNumber) =>
                pageNumber === -1 ? (
                  <span
                    key={`gap-before-${pageNumber}-${pageNumbers.indexOf(pageNumber)}`}
                    className="px-1 text-sm text-gray-400"
                  >
                    …
                  </span>
                ) : (
                  <Link
                    key={pageNumber}
                    href={buildVillaSearchHref(currentParams, {
                      page: String(pageNumber),
                    })}
                    className={`min-w-10 rounded-xl px-3 py-2 text-center text-sm font-semibold ${
                      pageNumber === page
                        ? "bg-sky-600 text-white"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pageNumber}
                  </Link>
                )
              )}

              {page < totalPages ? (
                <Link
                  href={buildVillaSearchHref(currentParams, {
                    page: String(page + 1),
                  })}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Sonraki
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
