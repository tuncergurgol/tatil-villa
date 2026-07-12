"use client";

import Link from "next/link";
import { CORPORATE_SIDEBAR_NAV } from "@/lib/corporate-nav";

type CorporatePageSidebarProps = {
  currentSlug: string;
};

export default function CorporatePageSidebar({
  currentSlug,
}: CorporatePageSidebarProps) {
  return (
    <nav aria-label="Kurumsal sayfalar" className="space-y-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700/80">
        Kurumsal
      </p>

      <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {CORPORATE_SIDEBAR_NAV.map((item) => {
          const active = item.slug === currentSlug;
          const Icon = item.icon;

          return (
            <li key={item.slug} className="shrink-0 lg:shrink">
              <Link
                href={`/kurumsal/${item.slug}`}
                className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm font-semibold transition ${
                  active
                    ? "border-teal-300 bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-900 shadow-sm ring-1 ring-teal-200/70"
                    : "border-slate-200/80 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-800 hover:shadow-sm"
                }`}
              >
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                    active
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 leading-snug whitespace-nowrap lg:whitespace-normal">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
