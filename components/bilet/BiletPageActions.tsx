import Link from "next/link";
import { Home, Search } from "lucide-react";
import { BILET_PUBLIC_ROUTES } from "@/lib/biletall";

type BiletPageActionsProps = {
  homeUrl: string;
  showSearchLink?: boolean;
  size?: "default" | "large";
};

export default function BiletPageActions({
  homeUrl,
  showSearchLink = true,
  size = "default",
}: BiletPageActionsProps) {
  const isLarge = size === "large";

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-3">
      {showSearchLink ? (
        <Link
          href={BILET_PUBLIC_ROUTES.ara}
          className={`inline-flex items-center gap-2 rounded-full bg-sky-600 font-semibold text-white shadow-sm transition hover:bg-sky-700 ${isLarge ? "px-5 py-2.5 text-base" : "px-4 py-2 text-sm"}`}
        >
          <Search className={isLarge ? "size-5" : "size-4"} aria-hidden />
          Bilet Ara
        </Link>
      ) : null}
      <Link
        href={homeUrl}
        className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 ${isLarge ? "px-5 py-2.5 text-base" : "px-4 py-2 text-sm"}`}
      >
        <Home className={isLarge ? "size-5" : "size-4"} aria-hidden />
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
