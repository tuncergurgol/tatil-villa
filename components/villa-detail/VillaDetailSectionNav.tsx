"use client";

import { useEffect, useState } from "react";

export type VillaDetailNavItem = {
  id: string;
  label: string;
};

type VillaDetailSectionNavProps = {
  items: VillaDetailNavItem[];
};

export default function VillaDetailSectionNav({
  items,
}: VillaDetailSectionNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [stuck, setStuck] = useState(false);

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
      { threshold: [1] }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <>
      <div id="villa-detail-nav-sentinel" className="h-px w-full" aria-hidden />
      <nav
        aria-label="Villa bölümleri"
        className={`sticky top-[7.5rem] z-40 -mx-4 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:top-[8.75rem] sm:mx-0 ${
          stuck ? "shadow-md" : ""
        }`}
      >
        <ul className="flex gap-0 overflow-x-auto px-2 scrollbar-thin sm:px-0">
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
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
      </nav>
    </>
  );
}
