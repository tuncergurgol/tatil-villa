"use client";

import {
  BedDouble,
  CalendarDays,
  CircleHelp,
  Info,
  MapPin,
  MessageCircle,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import { getVillaDetailNavTheme } from "@/lib/villa-detail-nav-theme";

export type VillaDetailNavItem = {
  id: string;
  label: string;
};

type VillaDetailSectionNavProps = {
  items: VillaDetailNavItem[];
  villaName: string;
  siteKey: PublicSiteKey;
  className?: string;
};

const FALLBACK_HEADER_PX = 88;

const NAV_ICONS: Record<string, LucideIcon> = {
  "genel-bakis": Info,
  "oda-kapasite": BedDouble,
  yorumlar: MessageCircle,
  olanaklar: Sparkles,
  lokasyon: MapPin,
  musaitlik: CalendarDays,
  "bilmeniz-gerekenler": Shield,
  sss: CircleHelp,
};

export default function VillaDetailSectionNav({
  items,
  villaName,
  siteKey,
  className = "",
}: VillaDetailSectionNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [stuck, setStuck] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(FALLBACK_HEADER_PX);
  const navRef = useRef<HTMLElement>(null);
  const title = villaName.trim();
  const theme = getVillaDetailNavTheme(siteKey);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;

    const ro = new ResizeObserver((entries) => {
      const blockSize = entries[0]?.borderBoxSize?.[0]?.blockSize;
      const height = Math.ceil(blockSize ?? 0);
      const next = height > 0 ? height : FALLBACK_HEADER_PX;
      setHeaderOffset((current) => (current === next ? current : next));
    });
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const ro = new ResizeObserver((entries) => {
      const navH = Math.ceil(entries[0]?.borderBoxSize?.[0]?.blockSize ?? 0);
      const root = document.documentElement;
      const below = `${headerOffset + navH}px`;
      const scrollMt = `${headerOffset + navH + 8}px`;
      if (root.style.getPropertyValue("--villa-detail-sticky-below-nav") !== below) {
        root.style.setProperty("--villa-detail-sticky-below-nav", below);
      }
      if (root.style.getPropertyValue("--villa-detail-scroll-mt") !== scrollMt) {
        root.style.setProperty("--villa-detail-scroll-mt", scrollMt);
      }
    });
    ro.observe(nav);
    return () => {
      ro.disconnect();
      const root = document.documentElement;
      root.style.removeProperty("--villa-detail-sticky-below-nav");
      root.style.removeProperty("--villa-detail-scroll-mt");
    };
  }, [headerOffset, stuck, title, items.length]);

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

  function goToSection(id: string) {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    }
  }

  if (items.length === 0) return null;

  return (
    <>
      <div id="villa-detail-nav-sentinel" className="h-px w-full" aria-hidden />
      <nav
        ref={navRef}
        aria-label="Villa bölümleri"
        style={{ top: headerOffset }}
        className={`sticky z-40 -mx-4 sm:mx-0 sm:border-b sm:border-slate-200 sm:bg-white ${
          stuck ? "shadow-md max-sm:border-0 max-sm:bg-transparent" : "max-sm:border-0 max-sm:bg-transparent"
        } ${className}`}
      >
        {/* Mobil: kaydırınca ikonlu sekme çubuğu */}
        {stuck ? (
          <div className={`sm:hidden ${theme.bar} mx-2 rounded-lg shadow-md`}>
            <ul className="flex gap-0 overflow-x-auto overscroll-x-contain px-1 py-1 [-webkit-overflow-scrolling:touch]">
              {items.map((item) => {
                const active = item.id === activeId;
                const Icon = NAV_ICONS[item.id] ?? Info;
                return (
                  <li key={item.id} className="shrink-0">
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        goToSection(item.id);
                      }}
                      className={`relative flex min-w-[4.5rem] flex-col items-center gap-1 px-2.5 py-2.5 transition ${
                        active ? theme.activeText : theme.inactiveText
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                      <span className="max-w-[5.5rem] truncate text-center text-[10px] font-semibold leading-tight">
                        {item.label}
                      </span>
                      {active ? (
                        <span
                          className={`absolute inset-x-2 bottom-1 h-0.5 rounded-full ${theme.activeIndicator}`}
                        />
                      ) : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {/* Masaüstü: villa adı (sticky) + sekmeler */}
        <div className="hidden min-w-0 items-stretch sm:flex">
          {stuck && title ? (
            <a
              href="#genel-bakis"
              title={title}
              onClick={(e) => {
                e.preventDefault();
                goToSection("genel-bakis");
              }}
              className="flex max-w-[220px] shrink-0 items-center border-r border-slate-200 px-3 py-2.5 text-[17px] font-bold leading-snug text-slate-900 md:max-w-[260px]"
            >
              <span className="truncate whitespace-nowrap">{title}</span>
            </a>
          ) : null}

          <ul className="flex min-w-0 flex-1 gap-0 overflow-x-auto overscroll-x-contain px-0 scrollbar-thin [-webkit-overflow-scrolling:touch]">
            {items.map((item) => {
              const active = item.id === activeId;
              return (
                <li key={item.id} className="shrink-0">
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      goToSection(item.id);
                    }}
                    className={`relative inline-flex cursor-pointer whitespace-nowrap px-3.5 py-3.5 text-sm font-medium transition ${
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
