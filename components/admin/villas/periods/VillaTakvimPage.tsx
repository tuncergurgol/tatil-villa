"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import VillaPeriodManagement from "@/components/admin/villas/periods/VillaPeriodManagement";
import type { VillaTakvimSearchItem } from "@/lib/queries/villa-takvim";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import type { VillaPricePeriodDayItem } from "@/lib/villa-period-days";
import { villaTakvimPath } from "@/lib/villa-takvim-path";
import { includesSearchText } from "@/lib/search-text";

interface VillaTakvimPageProps {
  villas: VillaTakvimSearchItem[];
  selected: {
    villa: VillaTakvimSearchItem;
    periods: VillaPricePeriodItem[];
    periodDays: VillaPricePeriodDayItem[];
  } | null;
  selectedVillaId?: string;
}

function matchesVillaQuery(villa: VillaTakvimSearchItem, query: string) {
  return [
    villa.name,
    villa.originalName,
    villa.documentNo,
    villa.slug,
    villa.id,
  ].some((value) => includesSearchText(value, query));
}

export default function VillaTakvimPage({
  villas,
  selected,
  selectedVillaId,
}: VillaTakvimPageProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredVillas = useMemo(
    () => villas.filter((villa) => matchesVillaQuery(villa, search)),
    [search, villas]
  );

  const activeVilla = selected?.villa ?? null;
  const periodCount = selected?.periods.length ?? 0;

  function selectVilla(villaId: string) {
    router.push(villaTakvimPath(villaId));
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col">
      <div className="shrink-0 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
            <p>
              <span className="font-semibold text-gray-900">Villa Adı:</span>{" "}
              <span className="text-gray-700">
                {activeVilla?.name ?? "—"}
              </span>
            </p>
            <p>
              <span className="font-semibold text-gray-900">
                Villa Orijinal Adı:
              </span>{" "}
              <span className="text-gray-700">
                {activeVilla?.originalName || "—"}
              </span>
            </p>
            <p>
              <span className="font-semibold text-gray-900">Ev Kodu:</span>{" "}
              <span className="text-gray-700">
                {activeVilla?.slug ?? "—"}
              </span>
            </p>
            <p>
              <span className="font-semibold text-gray-900">Belge No:</span>{" "}
              <span className="text-gray-700">
                {activeVilla?.documentNo || "—"}
              </span>
            </p>
            {activeVilla ? (
              <p className="text-gray-500">{periodCount} periyot tanımlı</p>
            ) : null}
          </div>

          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Villa adı, orijinal adı veya belge no ile ara..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
            {search.trim() ? (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {filteredVillas.length > 0 ? (
                  filteredVillas.map((villa) => (
                    <button
                      key={villa.id}
                      type="button"
                      onClick={() => {
                        selectVilla(villa.id);
                        setSearch("");
                      }}
                      className={`block w-full border-b border-gray-100 px-4 py-3 text-left text-sm transition hover:bg-indigo-50 ${
                        selectedVillaId === villa.id
                          ? "bg-indigo-50 font-semibold text-indigo-800"
                          : "text-gray-800"
                      }`}
                    >
                      <span className="block font-medium">{villa.name}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {villa.originalName || villa.slug}
                        {villa.documentNo ? ` • Belge ${villa.documentNo}` : ""}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-gray-500">
                    Eşleşen villa bulunamadı.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {selected ? (
        <VillaPeriodManagement
          villa={selected.villa}
          periods={selected.periods}
          periodDays={selected.periodDays}
          embedded
        />
      ) : (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-800">
              Villa seçin
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Üstteki arama alanından villa adı, orijinal adı veya belge no
              ile arayıp periyot takvimini açın.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
