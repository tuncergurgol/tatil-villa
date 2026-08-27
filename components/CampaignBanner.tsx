"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Campaign } from "@/lib/types";

interface CampaignBannerProps {
  campaigns: Campaign[];
}

const MAX_HOME_CAMPAIGNS = 4;

const ARROW_CLASS =
  "absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/25 text-white/80 ring-1 ring-inset ring-white/25 backdrop-blur-[2px] transition hover:bg-white/45 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-0 sm:h-9 sm:w-9";

export default function CampaignBanner({ campaigns }: CampaignBannerProps) {
  const items = campaigns.slice(0, MAX_HOME_CAMPAIGNS);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(items.length > 1);

  const syncArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 6);
    setCanNext(el.scrollLeft < maxScroll - 6);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncArrows();
    el.addEventListener("scroll", syncArrows, { passive: true });
    const observer = new ResizeObserver(syncArrows);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", syncArrows);
      observer.disconnect();
    };
  }, [items.length, syncArrows]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth,
      behavior: "smooth",
    });
  };

  if (items.length === 0) return null;

  return (
    <section
      id="kampanyalar"
      className="cv-auto overflow-x-hidden bg-gray-50 py-12 sm:py-16"
    >
      <div className="mx-auto min-w-0 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Kampanyalar
          </h2>
          <p className="mt-1 text-gray-600">
            Size özel fırsat ve kampanyaları kaçırmayın.
          </p>
        </div>

        <div className="relative min-w-0">
          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-2xl touch-pan-x [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((campaign) => (
              <article
                key={campaign.id}
                className="relative min-w-0 shrink-0 basis-full snap-start overflow-hidden"
              >
                <div className="relative aspect-[16/9] min-h-[176px] w-full sm:aspect-[21/9] sm:min-h-[200px] lg:aspect-[21/7]">
                  <Image
                    src={campaign.image}
                    alt={campaign.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    quality={60}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-center px-12 sm:px-16 lg:px-20">
                    <h3 className="max-w-md text-balance break-words text-xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:text-3xl lg:text-4xl">
                      {campaign.title}
                    </h3>
                    <p className="mt-2 max-w-sm text-pretty break-words text-sm text-white/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] sm:text-base">
                      {campaign.subtitle}
                    </p>
                    <Link
                      href={campaign.href}
                      className="mt-5 inline-flex max-w-full w-fit rounded-full bg-white px-5 py-2.5 text-sm font-bold text-teal-800 shadow-md transition hover:bg-teal-50 sm:mt-6 sm:px-6"
                    >
                      {campaign.cta}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => scrollByPage(-1)}
                disabled={!canPrev}
                aria-label="Önceki kampanya"
                className={`${ARROW_CLASS} left-2 sm:left-3`}
              >
                <ChevronLeft className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => scrollByPage(1)}
                disabled={!canNext}
                aria-label="Sonraki kampanya"
                className={`${ARROW_CLASS} right-2 sm:right-3`}
              >
                <ChevronRight className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
