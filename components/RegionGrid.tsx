"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Region } from "@/lib/types";

interface RegionGridProps {
  regions: Region[];
}

/** Bento boyut deseni — 3 sütunlu masonry hissi */
const BENTO_SIZES = [
  "min-h-[280px] sm:row-span-2 sm:min-h-[360px]",
  "min-h-[160px] sm:min-h-[170px]",
  "min-h-[200px] sm:row-span-2 sm:min-h-[280px]",
  "min-h-[180px] sm:min-h-[200px]",
  "min-h-[160px] sm:min-h-[170px]",
  "min-h-[160px] sm:min-h-[170px]",
  "min-h-[180px] sm:min-h-[200px]",
  "min-h-[160px] sm:min-h-[170px]",
  "min-h-[200px] sm:min-h-[220px]",
] as const;

export default function RegionGrid({ regions }: RegionGridProps) {
  const sorted = useMemo(
    () => [...regions].sort((a, b) => b.villaCount - a.villaCount),
    [regions]
  );

  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (!activeSlug) return sorted;
    return sorted.filter((region) => region.slug === activeSlug);
  }, [sorted, activeSlug]);

  if (sorted.length === 0) return null;

  return (
    <section id="bolgeler" className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Popüler Bölgeler
          </h2>
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-sky-500" />
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSlug(null)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              activeSlug === null
                ? "border-sky-500 bg-sky-50 text-sky-700"
                : "border-sky-200 bg-white text-sky-600 hover:border-sky-400 hover:bg-sky-50"
            }`}
          >
            Tümü
          </button>
          {sorted.map((region) => (
            <button
              key={region.id}
              type="button"
              onClick={() => setActiveSlug(region.slug)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                activeSlug === region.slug
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-sky-200 bg-white text-sky-600 hover:border-sky-400 hover:bg-sky-50"
              }`}
            >
              {region.name}
            </button>
          ))}
        </div>

        <div className="grid auto-rows-[minmax(140px,auto)] grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {visible.map((region, index) => {
            const sizeClass =
              activeSlug !== null
                ? "min-h-[240px] sm:min-h-[320px]"
                : BENTO_SIZES[index % BENTO_SIZES.length];

            return (
              <Link
                key={region.id}
                href={`/villalar?region=${encodeURIComponent(region.slug)}&sort=random`}
                className={`group relative overflow-hidden rounded-[1.75rem] ${sizeClass}`}
              >
                <Image
                  src={region.image}
                  alt={region.name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                  <h3 className="text-xl font-bold drop-shadow-sm sm:text-2xl">
                    {region.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-white/90">
                    {region.villaCount} Villa
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
