"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import VillaPeriodManagement from "@/components/admin/villas/periods/VillaPeriodManagement";
import TakvimVillaGrid from "@/components/admin/villas/periods/TakvimVillaGrid";
import TakvimVillaSearch from "@/components/admin/villas/periods/TakvimVillaSearch";
import type { VillaTakvimSearchItem } from "@/lib/queries/villa-takvim";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import type { VillaPricePeriodDayItem } from "@/lib/villa-period-days";
import { villaTakvimPath } from "@/lib/villa-takvim-path";

interface VillaTakvimPageProps {
  villas: VillaTakvimSearchItem[];
  selected: {
    villa: VillaTakvimSearchItem;
    periods: VillaPricePeriodItem[];
    periodDays: VillaPricePeriodDayItem[];
  } | null;
  selectedVillaParam?: string;
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

export default function VillaTakvimPage({
  villas,
  selected,
}: VillaTakvimPageProps) {
  const router = useRouter();

  if (!selected) {
    return <TakvimVillaGrid villas={villas} />;
  }

  const activeVilla = selected.villa;
  const periodCount = selected.periods.length;
  const originalName = activeVilla.originalName.trim();
  const documentNo = activeVilla.documentNo.trim();

  return (
    <div className="-mx-3 -mt-3 flex min-h-[calc(100dvh-4.5rem)] flex-col bg-[#f4f6fb] md:mx-0 md:mt-0 md:h-[calc(100dvh-3rem)]">
      <div className="shrink-0 border-b border-gray-200/80 bg-white px-3 py-3 shadow-sm md:px-5 md:py-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => router.push(villaTakvimPath())}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 md:gap-1.5 md:px-3 md:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Tüm Tesisler
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase md:text-xs">
                Villa Takvimi
              </p>
              <h1 className="mt-0.5 text-base font-bold leading-snug text-gray-900 md:text-xl">
                {activeVilla.name}
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1 text-xs text-gray-600 sm:grid-cols-2 md:text-sm">
            <p>
              <span className="font-semibold text-gray-800">Orjinal Ad:</span>{" "}
              {originalName || "—"}
            </p>
            <p>
              <span className="font-semibold text-gray-800">Villa ID:</span>{" "}
              {activeVilla.villaId ?? "—"}
            </p>
            <p>
              <span className="font-semibold text-gray-800">Belge No:</span>{" "}
              {documentNo || "—"}
            </p>
            <p>
              <span className="font-semibold text-gray-800">Fiyat (bugünden):</span>{" "}
              <span className="font-bold text-indigo-600">
                {formatPriceRange(activeVilla)}
              </span>
            </p>
            <p className="text-gray-500">{periodCount} periyot</p>
          </div>

          <TakvimVillaSearch villas={villas} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3 md:px-0 md:pb-0 md:pt-4">
        <VillaPeriodManagement
          villa={selected.villa}
          periods={selected.periods}
          periodDays={selected.periodDays}
          embedded
        />
      </div>
    </div>
  );
}
