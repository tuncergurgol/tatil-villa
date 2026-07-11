"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import VillaCard from "@/components/VillaCard";
import type { SimilarVillaCard } from "@/lib/queries/villa-detail";

const PAGE_SIZE = 3;

type SimilarVillasCarouselProps = {
  villas: SimilarVillaCard[];
};

export default function SimilarVillasCarousel({
  villas,
}: SimilarVillasCarouselProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(villas.length / PAGE_SIZE));

  const visible = useMemo(() => {
    const start = page * PAGE_SIZE;
    return villas.slice(start, start + PAGE_SIZE);
  }, [page, villas]);

  if (villas.length === 0) return null;

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="border-l-4 border-teal-700 pl-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Benzer Villalar
        </h2>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={!canPrev}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Önceki
            </button>
            <span className="min-w-[3.5rem] text-center text-xs font-medium text-slate-500">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.min(totalPages - 1, value + 1))
              }
              disabled={!canNext}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sonraki
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => (
          <VillaCard key={item.id} villa={item} layout="fluid" />
        ))}
      </div>
    </div>
  );
}
