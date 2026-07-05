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

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col bg-[#f4f6fb]">
      <div className="shrink-0 border-b border-gray-200/80 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.push(villaTakvimPath())}
              className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Tüm Tesisler
            </button>
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase">
                Villa Takvimi
              </p>
              <h1 className="mt-1 text-xl font-bold text-gray-900">
                {activeVilla.name}
              </h1>
              {activeVilla.originalName.trim() ? (
                <p className="mt-0.5 text-sm text-gray-500">
                  {activeVilla.originalName}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                {activeVilla.villaId != null ? (
                  <span>VillaID {activeVilla.villaId}</span>
                ) : null}
                {activeVilla.documentNo ? (
                  <span>Belge {activeVilla.documentNo}</span>
                ) : null}
                <span>{periodCount} periyot</span>
              </div>
            </div>
          </div>

          <TakvimVillaSearch villas={villas} />
        </div>
      </div>

      <VillaPeriodManagement
        villa={selected.villa}
        periods={selected.periods}
        periodDays={selected.periodDays}
        embedded
      />
    </div>
  );
}
