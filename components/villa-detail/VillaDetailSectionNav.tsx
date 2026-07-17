"use client";

import { useEffect, useRef, useState } from "react";

export type VillaDetailNavItem = {
  id: string;
  label: string;
};

type VillaDetailSectionNavProps = {
  items: VillaDetailNavItem[];
  villaName: string;
  className?: string;
};

const FALLBACK_HEADER_PX = 112;

export default function VillaDetailSectionNav({
  items,
  villaName,
  className = "",
}: VillaDetailSectionNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [stuck, setStuck] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(FALLBACK_HEADER_PX);
  const navRef = useRef<HTMLElement>(null);
  const title = villaName.trim();

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;

    const syncHeaderHeight = () => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      if (height > 0) setHeaderOffset(height);
    };

    syncHeaderHeight();
    const ro = new ResizeObserver(syncHeaderHeight);
    ro.observe(header);
    window.addEventListener("resize", syncHeaderHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncHeaderHeight);
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const syncOffsets = () => {
      const navH = Math.ceil(nav.getBoundingClientRect().height);
      const root = document.documentElement;
      root.style.setProperty(
        "--villa-detail-sticky-below-nav",
        `${headerOffset + navH}px`
      );
      root.style.setProperty(
        "--villa-detail-scroll-mt",
        `${headerOffset + navH + 8}px`
      );
    };

    syncOffsets();
    const ro = new ResizeObserver(syncOffsets);
    ro.observe(nav);
    return () => {
      ro.disconnect();
      const root = document.documentElement;
      root.style.removeProperty("--villa-detail-sticky-below-nav");
      root.style.removeProperty("--villa-detail-scroll-mt");
    };
  }, [headerOffset, stuck, title]);

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-22% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5],
      }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const sentinel = document.getElementById("villa-detail-nav-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStuck(!entry.isIntersecting);
      },
      {
        rootMargin: `-${headerOffset}px 0px 0px 0px`,
        threshold: [1],
      }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [headerOffset]);

  if (items.length === 0) return null;

  return (
    <>
      <div id="villa-detail-nav-sentinel" className="h-px w-full" aria-hidden />
      <nav
        ref={navRef}
        aria-label="Villa bölümleri"
        style={{ top: headerOffset }}
        className={`sticky z-40 -mx-4 border-b border-slate-200 bg-white sm:mx-0 ${
          stuck ? "shadow-md" : ""
        } ${className}`}
      >
        <div className="flex min-w-0 items-stretch">
          {stuck && title ? (
            <a
              href="#genel-bakis"
              title={title}
              className="flex max-w-[42%] shrink-0 items-center border-r border-slate-200 px-2.5 py-2.5 text-[15px] font-bold leading-snug text-slate-900 sm:max-w-[220px] sm:px-3 sm:text-[17px] md:max-w-[260px]"
            >
              <span className="line-clamp-2 sm:truncate sm:whitespace-nowrap">
                {title}
              </span>
            </a>
          ) : null}

          <ul className="flex min-w-0 flex-1 gap-0 overflow-x-auto overscroll-x-contain px-1 scrollbar-thin sm:px-0 [-webkit-overflow-scrolling:touch]">
            {items.map((item) => {
              const active = item.id === activeId;
              return (
                <li key={item.id} className="shrink-0">
                  <a
                    href={`#${item.id}`}
                    className={`relative inline-flex cursor-pointer whitespace-nowrap px-3 py-3.5 text-[13px] font-medium transition sm:px-3.5 sm:text-sm ${
                      active
                        ? "text-teal-800"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {item.label}
                    {active ? (
                      <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal-700" />
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
