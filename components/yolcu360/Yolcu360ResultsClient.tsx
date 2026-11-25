"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Yolcu360CarResult } from "@/lib/yolcu360/types";
import { parseYolcu360DriverAge } from "@/lib/yolcu360/driver-age";
import { saveYolcu360BookingSession } from "@/lib/yolcu360/session";
import {
  applyCarSearchFilters,
  buildSearchFacets,
  CAR_SEARCH_BASE_PARAM_KEYS,
  clearCarSearchFilters,
  hasActiveCarFilters,
  parseFilterParams,
  serializeFilterParams,
  sortCarResults,
  type CarSearchFilterState,
  type CarSearchSortBy,
} from "@/lib/yolcu360/search-filters";
import Yolcu360ResultsFilters from "@/components/yolcu360/Yolcu360ResultsFilters";
import Yolcu360ResultCard from "@/components/yolcu360/Yolcu360ResultCard";

type SearchParams = Record<string, string>;

const SORT_OPTIONS: Array<{ value: CarSearchSortBy; label: string }> = [
  { value: "lowest_price_first", label: "En düşük fiyat" },
  { value: "highest_price_first", label: "En yüksek fiyat" },
  { value: "brand_az", label: "Marka (A-Z)" },
  { value: "vendor_az", label: "Şirket (A-Z)" },
];

function pickBaseSearchParams(params: SearchParams): SearchParams {
  const base: SearchParams = {};
  for (const key of CAR_SEARCH_BASE_PARAM_KEYS) {
    if (params[key]) base[key] = params[key];
  }
  return base;
}

function baseSearchParamsKey(params: SearchParams) {
  return JSON.stringify(pickBaseSearchParams(params));
}

async function resolveLocationPoint(placeId: string) {
  const res = await fetch(
    `/api/yolcu360/locations?placeId=${encodeURIComponent(placeId)}`
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Konum bilgisi alınamadı");
  }
  return (await res.json()) as {
    point: { lat: number; lon: number };
    timezone?: string;
  };
}

function toRfc3339(date: string, time: string, timezone = "+03:00") {
  return `${date}T${time}:00${timezone}`;
}

function isPastDateTime(date: string, time: string) {
  const normalized = toRfc3339(date, time);
  const parsed = new Date(normalized);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
}

export default function Yolcu360ResultsClient({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allResults, setAllResults] = useState<Yolcu360CarResult[]>([]);
  const [filters, setFilters] = useState<CarSearchFilterState>(() =>
    parseFilterParams(searchParams)
  );

  const baseSearchParams = useMemo(
    () => pickBaseSearchParams(searchParams),
    [searchParams]
  );
  const searchKey = useMemo(() => baseSearchParamsKey(searchParams), [searchParams]);

  useEffect(() => {
    setFilters(parseFilterParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const pickup = await resolveLocationPoint(baseSearchParams.pickupPlaceId);
        const returnPlaceId =
          baseSearchParams.sameLocation === "1"
            ? baseSearchParams.pickupPlaceId
            : baseSearchParams.returnPlaceId;
        const dropoff = await resolveLocationPoint(returnPlaceId);

        const tz = pickup.timezone?.includes("/")
          ? "+03:00"
          : pickup.timezone || "+03:00";

        if (
          isPastDateTime(baseSearchParams.checkInDate, baseSearchParams.checkInTime) ||
          isPastDateTime(baseSearchParams.checkOutDate, baseSearchParams.checkOutTime)
        ) {
          throw new Error(
            "Alış veya teslim tarihi geçmişte. Lütfen gelecekte bir tarih ve saat seçin."
          );
        }

        const res = await fetch("/api/yolcu360/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkInDateTime: toRfc3339(
              baseSearchParams.checkInDate,
              baseSearchParams.checkInTime,
              tz
            ),
            checkOutDateTime: toRfc3339(
              baseSearchParams.checkOutDate,
              baseSearchParams.checkOutTime,
              tz
            ),
            age: parseYolcu360DriverAge(baseSearchParams.age),
            country: "TR",
            paymentType: "creditCard",
            checkInLocation: pickup.point,
            checkOutLocation: dropoff.point,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Arama başarısız");
        }
        if (!cancelled) {
          setAllResults(data.results ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Arama başarısız");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void run();

    return () => {
      cancelled = true;
    };
  }, [baseSearchParams, searchKey]);

  const facets = useMemo(
    () => buildSearchFacets(allResults, filters),
    [allResults, filters]
  );

  const filteredResults = useMemo(() => {
    const filtered = applyCarSearchFilters(allResults, filters);
    return sortCarResults(filtered, filters.sortBy);
  }, [allResults, filters]);

  function updateFilters(next: CarSearchFilterState) {
    setFilters(next);
    const params = serializeFilterParams(baseSearchParams, next);
    const query = new URLSearchParams(params).toString();
    router.replace(`/arac-kiralama/sonuclar?${query}`, { scroll: false });
  }

  function handleClearFilters() {
    updateFilters(clearCarSearchFilters(filters));
  }

  function selectCar(car: Yolcu360CarResult) {
    saveYolcu360BookingSession({
      searchID: car.searchID,
      code: car.code,
      car,
      integrationCode: car.integrationCode,
      isFindeksRequired: car.isFindeksRequired,
      searchParams,
    });
    router.push("/arac-kiralama/rezervasyon");
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
        Araçlar aranıyor…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
        <div className="mt-4">
          <Link href="/arac-kiralama" className="font-semibold underline">
            Yeni arama yap
          </Link>
        </div>
      </div>
    );
  }

  if (allResults.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-slate-600">Bu kriterlere uygun araç bulunamadı.</p>
        <Link
          href="/arac-kiralama"
          className="mt-4 inline-block font-semibold text-teal-700 underline"
        >
          Yeni arama yap
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Yolcu360ResultsFilters
        facets={facets}
        filters={filters}
        onChange={updateFilters}
        onClear={handleClearFilters}
      />

      <div className="min-w-0 space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{filteredResults.length}</span> /{" "}
            {allResults.length} araç gösteriliyor
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-medium">Sırala</span>
            <select
              value={filters.sortBy}
              onChange={(event) =>
                updateFilters({
                  ...filters,
                  sortBy: event.target.value as CarSearchSortBy,
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredResults.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-slate-600">
              Seçili filtrelere uygun araç bulunamadı. Filtreleri gevşetmeyi deneyin.
            </p>
            {hasActiveCarFilters(filters) ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 text-sm font-semibold text-teal-700 underline"
              >
                Filtreleri temizle
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResults.map((car) => (
              <Yolcu360ResultCard
                key={`${car.searchID}-${car.code}`}
                car={car}
                onSelect={selectCar}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
