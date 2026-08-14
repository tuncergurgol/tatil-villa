"use client";

import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { useAdminMobileNav } from "@/components/admin/mobile/AdminMobileNavContext";

export default function AdminMobileBottomBar() {
  const { goDashboard, goBack, canGoBack } = useAdminMobileNav();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      aria-label="Mobil navigasyon"
    >
      <div className="mx-auto grid max-w-lg grid-cols-2 gap-2 px-3 py-2">
        <button
          type="button"
          onClick={goDashboard}
          className="inline-flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm transition active:bg-violet-700"
        >
          <LayoutDashboard className="h-5 w-5" />
          Dashboard
        </button>
        <button
          type="button"
          onClick={goBack}
          disabled={!canGoBack}
          className="inline-flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow-sm transition active:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-5 w-5" />
          Geri
        </button>
      </div>
    </nav>
  );
}
