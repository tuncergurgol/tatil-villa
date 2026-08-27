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
const AUTO_ADVANCE_MS = 5000;

const ARROW_CLASS =
  "absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/40 text-slate-800/75 ring-1 ring-inset ring-white/50 backdrop-blur-[3px] transition hover:bg-white/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:pointer-events-none disabled:opacity-0 sm:h-9 sm:w-9";

export default function CampaignBanner({ campaigns }: CampaignBannerProps) {
  const items = campaigns.slice(0, MAX_HOME_CAMPAIGNS);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const inViewRef = useRef(true);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(items.length > 1);

  const syncArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 6);
    setCanNext(el.scrollLeft < maxScroll - 6);
  }, []);

  const advance = useCallback((direction: -1 | 1, wrap: boolean) => {
    const el = scrollerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (direction === 1) {
      if (el.scrollLeft >= maxScroll - 6) {
        if (wrap) el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      el.scrollBy({ left: width, behavior: "smooth" });
      return;
    }
    if (el.scrollLeft <= 6) {
      if (wrap) el.scrollTo({ left: maxScroll, behavior: "smooth" });
      return;
    }
    el.scrollBy({ left: -width, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const snapToPage = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      const target = Math.round(el.scrollLeft / width) * width;
      if (Math.abs(el.scrollLeft - target) > 2) {
        el.scrollTo({ left: target });
      }
      syncArrows();
    };

    syncArrows();
    el.addEventListener("scroll", syncArrows, { passive: true });
    const observer = new ResizeObserver(snapToPage);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", syncArrows);
      observer.disconnect();
    };
  }, [items.length, syncArrows]);

  useEffect(() => {
    if (items.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = sliderRef.current;
    const io = root
      ? new IntersectionObserver(
          ([entry]) => {
            inViewRef.current = entry?.isIntersecting ?? false;
          },
          { threshold: 0.35 }
        )
      : null;
    if (root && io) io.observe(root);

    const timer = window.setInterval(() => {
      if (pausedRef.current || document.hidden || !inViewRef.current) return;
      advance(1, true);
    }, AUTO_ADVANCE_MS);

    return () => {
      io?.disconnect();
      window.clearInterval(timer);
    };
  }, [advance, items.length]);

  const hoverRef = useRef(false);
  const holdRef = useRef(false);
  const syncPaused = () => {
    pausedRef.current = hoverRef.current || holdRef.current;
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

        <div
          ref={sliderRef}
          className="relative min-w-0"
          onPointerEnter={() => {
            hoverRef.current = true;
            syncPaused();
          }}
          onPointerLeave={() => {
            hoverRef.current = false;
            holdRef.current = false;
            syncPaused();
          }}
          onPointerDown={() => {
            holdRef.current = true;
            syncPaused();
          }}
          onPointerUp={() => {
            holdRef.current = false;
            syncPaused();
          }}
          onPointerCancel={() => {
            holdRef.current = false;
            syncPaused();
          }}
        >
          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory overflow-y-hidden overscroll-x-contain rounded-2xl touch-pan-x [overflow-x:auto] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                onClick={() => advance(-1, false)}
                disabled={!canPrev}
                aria-label="Önceki kampanya"
                className={`${ARROW_CLASS} left-2 sm:left-3`}
              >
                <ChevronLeft className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => advance(1, false)}
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
