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
  size?: "default" | "large";
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
  size = "default",
  children,
}: BiletShellProps) {
  const isLarge = size === "large";

  return (
    <div className="relative overflow-hidden bg-[linear-gradient(180deg,#f0f9ff_0%,#fff7ed_38%,#ffffff_100%)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(125,211,252,0.22),transparent_48%),radial-gradient(ellipse_at_88%_8%,rgba(253,186,116,0.18),transparent_42%)]"
      />

      <div
        className={`relative mx-auto max-w-6xl px-4 sm:px-6 ${isLarge ? "py-12 sm:py-16" : "py-10 sm:py-14"}`}
      >
        <div className={`mx-auto text-center ${isLarge ? "max-w-3xl" : "max-w-2xl"}`}>
          {homeUrl ? (
            <Link
              href={homeUrl}
              className={`inline-flex items-center gap-1 font-semibold text-sky-700 transition hover:text-sky-900 ${isLarge ? "text-base" : "text-sm"}`}
            >
              ← Ana Sayfa
            </Link>
          ) : null}

          <h1
            className={`mt-4 font-bold tracking-tight text-slate-900 ${isLarge ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl sm:text-3xl"}`}
          >
            {title}
          </h1>
          <p
            className={`mt-3 leading-relaxed text-slate-600 ${isLarge ? "text-base sm:text-lg lg:text-xl" : "text-sm sm:text-base"}`}
          >
            {description}
          </p>

          <nav
            aria-label="Bilet adımları"
            className="mt-7 flex flex-wrap items-center justify-center gap-2.5"
          >
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = activeKind === step.kind;

              return (
                <Link
                  key={step.kind}
                  href={step.path}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center gap-2 rounded-full border font-semibold transition ${
                    isLarge ? "px-4 py-2 text-sm sm:text-base" : "px-3.5 py-1.5 text-xs sm:text-sm"
                  } ${
                    isActive
                      ? "border-sky-200 bg-white text-sky-800 shadow-sm ring-1 ring-sky-100"
                      : "border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={isLarge ? "size-4 shrink-0" : "size-3.5 shrink-0"}
                    strokeWidth={2.2}
                  />
                  {step.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={`flex flex-col items-center gap-5 ${isLarge ? "mt-10" : "mt-8"}`}>
          {children}
          {homeUrl ? (
            <BiletPageActions
              homeUrl={homeUrl}
              showSearchLink={activeKind !== "ara"}
              size={size}
            />
          ) : null}
        </div>

        <ul
          className={`mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium text-slate-500 ${isLarge ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}
        >
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
