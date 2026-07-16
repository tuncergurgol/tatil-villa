import type { ReactNode } from "react";
import Link from "next/link";

type BiletShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function BiletShell({
  title,
  description,
  children,
}: BiletShellProps) {
  return (
    <div className="bg-[linear-gradient(180deg,#f0f9ff_0%,#fff7ed_42%,#ffffff_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-8 max-w-2xl">
          <Link
            href="/ucak-otobus"
            className="text-sm font-semibold text-sky-700 transition hover:text-sky-900"
          >
            ← Uçak / Otobüs
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            {description}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
