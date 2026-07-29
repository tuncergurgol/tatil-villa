"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Yolcu360CarResult } from "@/lib/yolcu360/types";
import { formatYolcu360Money } from "@/lib/yolcu360/format-money";
import { parseYolcu360DriverAge } from "@/lib/yolcu360/driver-age";
import { saveYolcu360BookingSession } from "@/lib/yolcu360/session";

type SearchParams = Record<string, string>;

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
  const [results, setResults] = useState<Yolcu360CarResult[]>([]);

  useEffect(() => {
    async function run() {
      try {
        const pickup = await resolveLocationPoint(searchParams.pickupPlaceId);
        const returnPlaceId =
          searchParams.sameLocation === "1"
            ? searchParams.pickupPlaceId
            : searchParams.returnPlaceId;
        const dropoff = await resolveLocationPoint(returnPlaceId);

        const tz = pickup.timezone?.includes("/")
          ? "+03:00"
          : pickup.timezone || "+03:00";

        if (
          isPastDateTime(searchParams.checkInDate, searchParams.checkInTime) ||
          isPastDateTime(searchParams.checkOutDate, searchParams.checkOutTime)
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
              searchParams.checkInDate,
              searchParams.checkInTime,
              tz
            ),
            checkOutDateTime: toRfc3339(
              searchParams.checkOutDate,
              searchParams.checkOutTime,
              tz
            ),
            age: parseYolcu360DriverAge(searchParams.age),
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
        setResults(data.results ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Arama başarısız");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [searchParams]);

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

  if (results.length === 0) {
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
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{results.length} araç bulundu</p>
      {results.map((car) => {
        const total = car.pricing?.paymentTotal ?? car.pricing?.total;
        return (
          <article
            key={`${car.searchID}-${car.code}`}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row"
          >
            {car.imageURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={car.imageURL}
                alt={`${car.brand?.name ?? ""} ${car.model?.name ?? ""}`}
                className="h-32 w-full rounded-xl object-cover sm:w-48"
              />
            ) : (
              <div className="flex h-32 w-full items-center justify-center rounded-xl bg-slate-100 text-slate-400 sm:w-48">
                Araç
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">
                {car.brand?.name} {car.model?.name}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {car.class?.name} · {car.transmission?.name} · {car.fuel?.name}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {car.vendor?.displayName ?? car.vendor?.name}
              </p>
              {car.isFindeksRequired ? (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  Findeks kontrolü gerekli
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-end justify-between gap-3">
              {total ? (
                <p className="text-2xl font-bold text-teal-700">
                  {formatYolcu360Money(total.amount, total.currency)}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => selectCar(car)}
                className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Seç ve devam et
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
