import type { ReactNode } from "react";
import Link from "next/link";

type TursabRotaShellProps = {
  children: ReactNode;
};

export default function TursabRotaShell({ children }: TursabRotaShellProps) {
  return (
    <div className="bg-[linear-gradient(180deg,#f0f9ff_0%,#fdf2f8_38%,#ffffff_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-8 max-w-2xl">
          <Link
            href="/"
            className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
          >
            ← Ana sayfa
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Tur Rezervasyonu
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            Yurt içi ve yurt dışı tur paketlerini TÜRSAB Rota üzerinden güvenle
            inceleyin ve rezervasyon yapın. Günübirlik aktiviteler için{" "}
            <Link
              href="/tur/liste"
              className="font-semibold text-sky-700 underline-offset-2 hover:underline"
            >
              yerel tur listemize
            </Link>{" "}
            göz atabilirsiniz.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
