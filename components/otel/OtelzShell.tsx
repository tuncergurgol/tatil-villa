import type { ReactNode } from "react";
import Link from "next/link";
import { Building2, Clock3, Hotel, Sparkles } from "lucide-react";
import type { OtelzSalesPageId } from "@/lib/otelz";
import { OTELZ_PUBLIC_ROUTE } from "@/lib/otelz";

type OtelzShellProps = {
  title: string;
  description: string;
  activePageId?: OtelzSalesPageId;
  homeUrl?: string;
  children: ReactNode;
};

const CATEGORY_ICONS = {
  home: Hotel,
  early: Sparkles,
  hourly: Clock3,
  zpara: Building2,
} as const;

const CATEGORIES: Array<{
  id: OtelzSalesPageId;
  label: string;
}> = [
  { id: "home", label: "Otel Ara" },
  { id: "early", label: "Erken Rezervasyon" },
  { id: "hourly", label: "Saatlik Oda" },
  { id: "zpara", label: "Zpara Oteller" },
];

export default function OtelzShell({
  title,
  description,
  activePageId = "home",
  homeUrl,
  children,
}: OtelzShellProps) {
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(180deg,#e0f2fe_0%,#f0f9ff_38%,#ffffff_100%)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(0,172,255,0.18),transparent_48%),radial-gradient(ellipse_at_90%_6%,rgba(56,189,248,0.14),transparent_42%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          {homeUrl ? (
            <Link
              href={homeUrl}
              className="inline-flex items-center gap-1 text-base font-semibold text-sky-700 transition hover:text-sky-900"
            >
              ← Ana Sayfa
            </Link>
          ) : null}

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
            {description}
          </p>

          <nav
            aria-label="Otel kategorileri"
            className="mt-7 flex flex-wrap items-center justify-center gap-2.5"
          >
            {CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category.id];
              const isActive = activePageId === category.id;
              const href =
                category.id === "home"
                  ? OTELZ_PUBLIC_ROUTE
                  : `${OTELZ_PUBLIC_ROUTE}?kategori=${category.id}`;

              return (
                <Link
                  key={category.id}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition sm:text-base ${
                    isActive
                      ? "border-sky-200 bg-white text-sky-800 shadow-sm ring-1 ring-sky-100"
                      : "border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={2.2} />
                  {category.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center gap-6">{children}</div>

        <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-slate-500 sm:text-base">
          <li className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-sky-500" aria-hidden />
            Otelz güvencesiyle
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Güvenli ödeme
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-cyan-500" aria-hidden />
            Türkiye geneli oteller
          </li>
        </ul>
      </div>
    </div>
  );
}
