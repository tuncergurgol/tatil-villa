import type { ReactNode } from "react";
import Link from "next/link";
import { Bus, Plane, Ticket } from "lucide-react";
import BiletPageActions from "@/components/bilet/BiletPageActions";
import type { BiletallIframeKind } from "@/lib/biletall";
import { BILET_PUBLIC_ROUTES } from "@/lib/biletall";

type BiletShellProps = {
  title: string;
  description: string;
  activeKind?: BiletallIframeKind;
  homeUrl?: string;
  children: ReactNode;
};

const STEPS: {
  kind: BiletallIframeKind;
  label: string;
  path: string;
  icon: typeof Plane;
}[] = [
  { kind: "ara", label: "Bilet Ara", path: BILET_PUBLIC_ROUTES.ara, icon: Plane },
  {
    kind: "satinal",
    label: "Satın Al",
    path: BILET_PUBLIC_ROUTES.satinal,
    icon: Bus,
  },
  {
    kind: "sonuc",
    label: "PNR / Sonuç",
    path: BILET_PUBLIC_ROUTES.sonuc,
    icon: Ticket,
  },
];

export default function BiletShell({
  title,
  description,
  activeKind,
  homeUrl,
  children,
}: BiletShellProps) {
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(180deg,#f0f9ff_0%,#fff7ed_38%,#ffffff_100%)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(125,211,252,0.22),transparent_48%),radial-gradient(ellipse_at_88%_8%,rgba(253,186,116,0.18),transparent_42%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <Link
            href="/ucak-otobus"
            className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 transition hover:text-sky-900"
          >
            ← Uçak / Otobüs
          </Link>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            {description}
          </p>

          <nav
            aria-label="Bilet adımları"
            className="mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = activeKind === step.kind;

              return (
                <Link
                  key={step.kind}
                  href={step.path}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
                    isActive
                      ? "border-sky-200 bg-white text-sky-800 shadow-sm ring-1 ring-sky-100"
                      : "border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" strokeWidth={2.2} />
                  {step.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          {children}
          {homeUrl ? (
            <BiletPageActions
              homeUrl={homeUrl}
              showSearchLink={activeKind !== "ara"}
            />
          ) : null}
        </div>

        <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500 sm:text-sm">
          <li className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Güvenli ödeme
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-sky-500" aria-hidden />
            Anında e-bilet
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-orange-500" aria-hidden />
            Tüm firmalar tek ekranda
          </li>
        </ul>
      </div>
    </div>
  );
}
