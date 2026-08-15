"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import VillaPeriodManagement from "@/components/admin/villas/periods/VillaPeriodManagement";
import TakvimVillaSearch from "@/components/admin/villas/periods/TakvimVillaSearch";
import { villaAdminEditPath } from "@/lib/villa-admin-path";
import type { VillaTakvimSearchItem } from "@/lib/villa-takvim-types";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import type { VillaPricePeriodDayItem } from "@/lib/villa-period-days";
import { villaTakvimPath } from "@/lib/villa-takvim-path";

interface VillaTakvimSelectedViewProps {
  selected: {
    villa: VillaTakvimSearchItem;
    periods: VillaPricePeriodItem[];
    periodDays: VillaPricePeriodDayItem[];
  };
  onSaved: () => void;
}

function formatPriceRange(villa: VillaTakvimSearchItem) {
  const { minFuturePrice, maxFuturePrice, displayPriceCurrency } = villa;
  const suffix = displayPriceCurrency === "TL" ? "₺" : ` ${displayPriceCurrency}`;
  const format = (value: number) => `${value.toLocaleString("tr-TR")}${suffix}`;

  if (minFuturePrice != null && maxFuturePrice != null) {
    if (minFuturePrice === maxFuturePrice) return format(minFuturePrice);
    return `${format(minFuturePrice)} – ${format(maxFuturePrice)}`;
  }
  if (minFuturePrice != null) return format(minFuturePrice);
  if (maxFuturePrice != null) return format(maxFuturePrice);
  if (villa.displayPrice != null) return format(villa.displayPrice);
  return "—";
}

export default function VillaTakvimSelectedView({
  selected,
  onSaved,
}: VillaTakvimSelectedViewProps) {
  const router = useRouter();
  const activeVilla = selected.villa;
  const originalName = activeVilla.originalName.trim();
  const documentNo = activeVilla.documentNo.trim();

  return (
    <div className="-mx-3 -mt-3 flex min-h-[calc(100dvh-4.5rem)] flex-col bg-[#f4f6fb] md:mx-0 md:mt-0 md:h-[calc(100dvh-3rem)]">
      <div className="shrink-0 border-b border-gray-200/80 bg-white px-3 py-3 shadow-sm md:px-5 md:py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 md:h-24 md:w-36">
              {activeVilla.image ? (
                <Image
                  src={activeVilla.image}
                  alt={activeVilla.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-medium text-gray-400">
                  VİLLA
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="truncate text-lg font-bold leading-snug text-gray-900 md:text-xl">
                {activeVilla.name}
              </h1>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">Villa Orijinal Adı:</span>{" "}
                {originalName || "—"}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">Villa ID:</span>{" "}
                {activeVilla.villaId ?? "—"}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">Belge No:</span>{" "}
                {documentNo || "—"}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 lg:w-80">
            <button
              type="button"
              onClick={() => router.push(villaTakvimPath())}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Tüm Tesisler
            </button>
            <Link
              href={villaAdminEditPath(activeVilla)}
              className="inline-flex items-center justify-center rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              Villa Detay
            </Link>
            <p className="text-center text-sm text-gray-600">
              Fiyat (bugünden):{" "}
              <span className="font-bold text-indigo-600">
                {formatPriceRange(activeVilla)}
              </span>
            </p>
            <TakvimVillaSearch remote />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3 md:px-0 md:pb-0 md:pt-4">
        <VillaPeriodManagement
          villa={selected.villa}
          periods={selected.periods}
          periodDays={selected.periodDays}
          embedded
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}
