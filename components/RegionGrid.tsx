"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Region } from "@/lib/types";

interface RegionGridProps {
  regions: Region[];
}

const PILL_COUNT = 12;

/**
 * 7 kartlık 3 sütun bento — boş hücre bırakmadan:
 * [tall] [short] [tall]
 * [tall] [short] [tall]
 * [eq  ] [eq   ] [eq  ]
 */
const BENTO_SIZES = [
  "min-h-[240px] lg:row-span-2 lg:min-h-[360px]",
  "min-h-[180px] lg:min-h-[170px]",
  "min-h-[240px] lg:row-span-2 lg:min-h-[280px]",
  "min-h-[180px] lg:min-h-[170px]",
  "min-h-[180px] lg:min-h-[200px]",
  "min-h-[180px] lg:min-h-[200px]",
  "min-h-[180px] lg:min-h-[200px]",
] as const;

export default function RegionGrid({ regions }: RegionGridProps) {
  const sorted = useMemo(
    () => [...regions].sort((a, b) => b.villaCount - a.villaCount),
    [regions]
  );

  const pillRegions = useMemo(() => sorted.slice(0, PILL_COUNT), [sorted]);
  const featured = useMemo(() => sorted.slice(0, 7), [sorted]);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (activeSlug) {
      return sorted.filter((region) => region.slug === activeSlug);
    }
    return featured;
  }, [sorted, featured, activeSlug]);

  if (sorted.length === 0 || (featured.length === 0 && !activeSlug)) return null;

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
            className={`inline-flex min-h-12 items-center rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
              activeSlug === null
                ? "border-sky-700 bg-sky-50 text-sky-800"
                : "border-sky-300 bg-white text-sky-700 hover:border-sky-500 hover:bg-sky-50"
            }`}
          >
            Tümü
          </button>
          {pillRegions.map((region) => (
            <button
              key={region.id}
              type="button"
              onClick={() => setActiveSlug(region.slug)}
              className={`inline-flex min-h-12 items-center rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                activeSlug === region.slug
                  ? "border-sky-700 bg-sky-50 text-sky-800"
                  : "border-sky-300 bg-white text-sky-700 hover:border-sky-500 hover:bg-sky-50"
              }`}
            >
              {region.name}
            </button>
          ))}
        </div>

        <div className="grid auto-rows-[minmax(140px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((region, index) => {
            const sizeClass =
              activeSlug !== null
                ? "min-h-[240px] sm:min-h-[320px]"
                : BENTO_SIZES[index % BENTO_SIZES.length];

            return (
              <Link
                key={region.id}
                href={`/villalar?region=${encodeURIComponent(region.slug)}`}
                className={`group relative overflow-hidden rounded-[1.75rem] ${sizeClass}`}
              >
                <Image
                  src={region.image}
                  alt={region.name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={65}
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
